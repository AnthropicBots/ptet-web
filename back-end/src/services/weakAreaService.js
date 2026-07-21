// back-end/src/services/weakAreaService.js

const { TestAttempt, UserAnswer, Question, MockTest } = require('../models');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const cacheService = require('./cache.service');
const recommendationService = require('./recommendation.service');

// ==================== CONFIGURATION ====================
const CACHE_TTL = 5 * 60; // 5 minutes in seconds
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

class WeakAreaService {
    constructor() {
        this.cache = cacheService;
        this.recommendationService = recommendationService;
        this.skillCategories = ['speaking', 'writing', 'reading', 'listening'];
        this.subSkillMap = {
            speaking: ['read_aloud', 'repeat_sentence', 'describe_image', 'retell_lecture', 'answer_short_question'],
            writing: ['essay', 'summary', 'letter', 'report', 'review'],
            reading: ['multiple_choice', 'true_false', 'fill_blank', 'matching', 'summary_completion'],
            listening: ['multiple_choice', 'fill_blank', 'matching', 'highlight_correct', 'select_missing_word']
        };
    }

    // ==================== GET WEAK SKILLS (Enhanced) ====================
    async getWeakSkills(userId, limit = 3, options = {}) {
        try {
            const {
                startDate = null,
                endDate = null,
                testType = null,
                minDifficulty = null,
                maxDifficulty = null,
                includeDetails = false
            } = options;

            // Validate inputs
            this.validateOptions({ limit, ...options });

            // Generate cache key
            const cacheKey = this.generateCacheKey(userId, 'weak_skills', options);
            
            // Try to get from cache
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                logger.debug(`Cache hit for weak skills: ${userId}`);
                return cachedData;
            }

            // Build query filters
            const filters = this.buildFilters(userId, {
                startDate,
                endDate,
                testType,
                minDifficulty,
                maxDifficulty
            });

            // Fetch all completed test attempts
            const attempts = await TestAttempt.findAll({
                where: {
                    user_id: userId,
                    status: 'completed',
                    ...(filters.dateFilter && {
                        created_at: {
                            [Op.between]: [filters.startDate, filters.endDate]
                        }
                    }),
                    ...(filters.testType && {
                        test_type: filters.testType
                    })
                },
                attributes: ['id', 'score_breakdown', 'total_score', 'created_at', 'test_id'],
                order: [['created_at', 'DESC']],
                ...(filters.limit && { limit: filters.limit }),
                ...(filters.offset && { offset: filters.offset })
            });

            if (!attempts.length) {
                return this.getEmptyResult(userId);
            }

            // Aggregate scores per skill with weighting
            const skillData = this.aggregateSkillScores(attempts, filters);
            
            // Calculate trends
            const trends = await this.calculateSkillTrends(userId, attempts);

            // Get weak skills
            const weakSkills = this.getWeakestSkills(skillData, limit);

            // Generate recommendations
            let recommendations = [];
            if (options.includeRecommendations !== false) {
                recommendations = await this.recommendationService.generateRecommendations(
                    userId,
                    weakSkills,
                    trends
                );
            }

            // Prepare result
            const result = {
                weakSkills: weakSkills,
                skillData: includeDetails ? skillData : undefined,
                trends: trends,
                recommendations: recommendations,
                summary: this.generateSkillSummary(skillData, weakSkills),
                metadata: {
                    totalAttempts: attempts.length,
                    filters: {
                        startDate,
                        endDate,
                        testType,
                        minDifficulty,
                        maxDifficulty
                    },
                    generatedAt: new Date().toISOString()
                }
            };

            // Cache the result
            await this.cache.set(cacheKey, result, CACHE_TTL);

            return result;
        } catch (error) {
            logger.error(`Get weak skills error for user ${userId}: ${error.message}`);
            throw new Error(`Failed to get weak skills: ${error.message}`);
        }
    }

    // ==================== GET WEAK AREAS (Detailed) ====================
    async getWeakAreas(userId, options = {}) {
        try {
            const {
                page = 1,
                limit = DEFAULT_PAGE_SIZE,
                startDate = null,
                endDate = null,
                testType = null,
                minDifficulty = null,
                maxDifficulty = null,
                categories = null,
                includeRecommendations = true
            } = options;

            // Validate inputs
            this.validateOptions(options);

            // Generate cache key
            const cacheKey = this.generateCacheKey(userId, 'weak_areas', options);
            
            // Try to get from cache
            const cachedData = await this.cache.get(cacheKey);
            if (cachedData) {
                logger.debug(`Cache hit for weak areas: ${userId}`);
                return cachedData;
            }

            // Build query filters
            const filters = this.buildFilters(userId, {
                startDate,
                endDate,
                testType,
                minDifficulty,
                maxDifficulty,
                categories
            });

            // Get weak areas data using UserAnswer
            const weakAreas = await this.calculateDetailedWeakAreas(userId, filters);

            // Calculate trends
            const trends = await this.calculateTrends(userId, filters);

            // Generate recommendations
            let recommendations = [];
            if (includeRecommendations) {
                recommendations = await this.recommendationService.generateRecommendations(
                    userId,
                    weakAreas,
                    trends
                );
            }

            // Prepare response
            const result = {
                weakAreas: this.paginateResults(weakAreas, page, limit),
                trends: trends,
                recommendations: recommendations,
                summary: this.generateDetailedSummary(weakAreas),
                metadata: {
                    page,
                    limit,
                    total: weakAreas.length,
                    totalPages: Math.ceil(weakAreas.length / limit),
                    filters: {
                        startDate,
                        endDate,
                        testType,
                        minDifficulty,
                        maxDifficulty,
                        categories
                    },
                    generatedAt: new Date().toISOString()
                }
            };

            // Cache the result
            await this.cache.set(cacheKey, result, CACHE_TTL);

            return result;
        } catch (error) {
            logger.error(`Get weak areas error for user ${userId}: ${error.message}`);
            throw new Error(`Failed to get weak areas: ${error.message}`);
        }
    }

    // ==================== AGGREGATE SKILL SCORES ====================
    aggregateSkillScores(attempts, filters) {
        const skillScores = {
            speaking: [],
            writing: [],
            reading: [],
            listening: []
        };

        // Weighted scores based on difficulty
        const weightedScores = {};

        attempts.forEach((attempt) => {
            const breakdown = attempt.score_breakdown || {};
            Object.keys(breakdown).forEach((skill) => {
                if (skillScores[skill] && typeof breakdown[skill] === 'number') {
                    // Apply weight based on difficulty if available
                    const weight = this.getSkillWeight(skill, attempt);
                    const weightedScore = breakdown[skill] * weight;
                    skillScores[skill].push({
                        score: breakdown[skill],
                        weightedScore: weightedScore,
                        attemptId: attempt.id,
                        date: attempt.created_at,
                        testId: attempt.test_id
                    });
                }
            });
        });

        // Compute averages and statistics
        const result = {};
        Object.entries(skillScores).forEach(([skill, scores]) => {
            if (scores.length) {
                const rawScores = scores.map(s => s.score);
                const weightedScores = scores.map(s => s.weightedScore);
                
                result[skill] = {
                    average: rawScores.reduce((a, b) => a + b, 0) / scores.length,
                    weightedAverage: weightedScores.reduce((a, b) => a + b, 0) / scores.length,
                    min: Math.min(...rawScores),
                    max: Math.max(...rawScores),
                    median: this.calculateMedian(rawScores),
                    attempts: scores.length,
                    recentScores: scores.slice(-5).map(s => s.score),
                    trend: this.calculateTrend(scores.map(s => s.score))
                };
            } else {
                result[skill] = {
                    average: null,
                    weightedAverage: null,
                    min: null,
                    max: null,
                    median: null,
                    attempts: 0,
                    recentScores: [],
                    trend: 'stable'
                };
            }
        });

        return result;
    }

    // ==================== CALCULATE DETAILED WEAK AREAS ====================
    async calculateDetailedWeakAreas(userId, filters) {
        try {
            const where = {
                user_id: userId,
                '$test_attempt.status$': 'completed'
            };

            if (filters.dateFilter) {
                where['$test_attempt.created_at$'] = {
                    [Op.between]: [filters.startDate, filters.endDate]
                };
            }

            if (filters.testType) {
                where['$question.type$'] = filters.testType;
            }

            if (filters.minDifficulty) {
                where['$question.difficulty$'] = {
                    [Op.gte]: filters.minDifficulty
                };
            }

            if (filters.maxDifficulty) {
                where['$question.difficulty$'] = {
                    [Op.lte]: filters.maxDifficulty
                };
            }

            if (filters.categories) {
                where['$question.category$'] = {
                    [Op.in]: filters.categories
                };
            }

            const userAnswers = await UserAnswer.findAll({
                where,
                include: [
                    {
                        model: Question,
                        as: 'question',
                        attributes: ['id', 'type', 'subtype', 'difficulty', 'category', 'subcategory']
                    },
                    {
                        model: TestAttempt,
                        as: 'attempt',
                        attributes: ['id', 'created_at', 'test_id']
                    }
                ],
                attributes: ['id', 'is_correct', 'time_spent']
            });

            if (!userAnswers.length) {
                return [];
            }

            // Group by category/subcategory/type
            const groupedData = {};
            userAnswers.forEach(answer => {
                const question = answer.question;
                if (!question) return;

                const key = `${question.category || 'uncategorized'}:${question.subcategory || 'none'}:${question.type}`;
                
                if (!groupedData[key]) {
                    groupedData[key] = {
                        category: question.category || 'uncategorized',
                        subcategory: question.subcategory || 'none',
                        type: question.type,
                        difficulty: question.difficulty || 1,
                        total_attempts: 0,
                        correct_attempts: 0,
                        time_spent: 0,
                        attempts: []
                    };
                }

                groupedData[key].total_attempts++;
                if (answer.is_correct) {
                    groupedData[key].correct_attempts++;
                }
                groupedData[key].time_spent += answer.time_spent || 0;
                groupedData[key].attempts.push({
                    is_correct: answer.is_correct,
                    time_spent: answer.time_spent || 0
                });
            });

            // Calculate success rates and other metrics
            const weakAreas = Object.values(groupedData).map(area => {
                const successRate = (area.correct_attempts / area.total_attempts) * 100;
                const avgTimeSpent = area.time_spent / area.total_attempts;
                
                return {
                    ...area,
                    success_rate: successRate,
                    avg_time_spent: avgTimeSpent,
                    weakness_score: this.calculateWeaknessScore({
                        success_rate: successRate,
                        difficulty: area.difficulty,
                        total_attempts: area.total_attempts
                    }),
                    priority: this.calculatePriority({
                        success_rate: successRate,
                        weakness_score: this.calculateWeaknessScore({
                            success_rate: successRate,
                            difficulty: area.difficulty,
                            total_attempts: area.total_attempts
                        })
                    }),
                    recommendations: this.generateAreaRecommendations({
                        success_rate: successRate,
                        avg_time_spent: avgTimeSpent,
                        category: area.category,
                        difficulty: area.difficulty
                    })
                };
            });

            // Filter to weak areas (success rate < 70%)
            return weakAreas
                .filter(area => area.success_rate < 70)
                .sort((a, b) => a.success_rate - b.success_rate);
        } catch (error) {
            logger.error(`Calculate detailed weak areas error: ${error.message}`);
            throw error;
        }
    }

    // ==================== TREND ANALYSIS ====================
    async calculateSkillTrends(userId, attempts) {
        try {
            const trends = {};
            
            // Group attempts by skill
            const skillTrends = {
                speaking: [],
                writing: [],
                reading: [],
                listening: []
            };

            attempts.forEach(attempt => {
                const breakdown = attempt.score_breakdown || {};
                Object.keys(breakdown).forEach(skill => {
                    if (skillTrends[skill] && typeof breakdown[skill] === 'number') {
                        skillTrends[skill].push({
                            date: attempt.created_at,
                            score: breakdown[skill],
                            attemptId: attempt.id
                        });
                    }
                });
            });

            // Calculate trend for each skill
            Object.keys(skillTrends).forEach(skill => {
                const data = skillTrends[skill];
                if (data.length >= 3) {
                    const scores = data.map(d => d.score);
                    const first = scores[0];
                    const last = scores[scores.length - 1];
                    const change = last - first;
                    
                    trends[skill] = {
                        data: data,
                        trend: change > 5 ? 'improving' : change < -5 ? 'declining' : 'stable',
                        change: change,
                        recentAverage: scores.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, scores.length),
                        overallAverage: scores.reduce((a, b) => a + b, 0) / scores.length
                    };
                } else if (data.length > 0) {
                    trends[skill] = {
                        data: data,
                        trend: 'insufficient_data',
                        change: 0,
                        recentAverage: data[data.length - 1]?.score || 0,
                        overallAverage: data.reduce((a, b) => a + b, 0) / data.length
                    };
                } else {
                    trends[skill] = {
                        data: [],
                        trend: 'no_data',
                        change: 0,
                        recentAverage: 0,
                        overallAverage: 0
                    };
                }
            });

            return trends;
        } catch (error) {
            logger.error(`Calculate skill trends error: ${error.message}`);
            return {};
        }
    }

    async calculateTrends(userId, filters) {
        // Get all attempts for trend analysis
        const attempts = await TestAttempt.findAll({
            where: {
                user_id: userId,
                status: 'completed',
                ...(filters.dateFilter && {
                    created_at: {
                        [Op.between]: [filters.startDate, filters.endDate]
                    }
                })
            },
            attributes: ['id', 'score_breakdown', 'created_at'],
            order: [['created_at', 'ASC']]
        });

        return this.calculateSkillTrends(userId, attempts);
    }

    // ==================== HELPERS ====================
    getWeakestSkills(skillData, limit) {
        const skillsWithScores = Object.entries(skillData)
            .filter(([_, data]) => data.average !== null)
            .map(([skill, data]) => ({
                skill,
                average: data.average,
                weightedAverage: data.weightedAverage || data.average,
                attempts: data.attempts,
                trend: data.trend || 'stable',
                weaknessScore: 100 - data.average
            }))
            .sort((a, b) => a.average - b.average);

        return skillsWithScores.slice(0, limit);
    }

    getSkillWeight(skill, attempt) {
        // Base weight 1.0
        let weight = 1.0;
        
        // Adjust based on difficulty if available
        if (attempt.test_id) {
            // Could fetch difficulty from test or questions
            // For now, return 1.0
        }
        
        return weight;
    }

    calculateTrend(scores) {
        if (scores.length < 3) return 'stable';
        
        const recent = scores.slice(-3);
        const older = scores.slice(0, 3);
        
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        
        const change = recentAvg - olderAvg;
        if (change > 5) return 'improving';
        if (change < -5) return 'declining';
        return 'stable';
    }

    calculateMedian(numbers) {
        if (!numbers.length) return null;
        const sorted = [...numbers].sort((a, b) => a - b);
        const middle = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[middle - 1] + sorted[middle]) / 2;
        }
        return sorted[middle];
    }

    calculateWeaknessScore(area) {
        const successRateWeight = 0.5;
        const difficultyWeight = 0.3;
        const attemptsWeight = 0.2;

        const difficultyScore = (area.difficulty / 5) * 100;
        const attemptsScore = Math.min((area.total_attempts / 10) * 100, 100);
        const successRateScore = 100 - area.success_rate;

        return Math.round(
            (successRateScore * successRateWeight) +
            (difficultyScore * difficultyWeight) +
            (attemptsScore * attemptsWeight)
        );
    }

    calculatePriority(area) {
        const score = area.weakness_score || 0;
        if (score >= 80) return 'high';
        if (score >= 60) return 'medium';
        return 'low';
    }

    generateAreaRecommendations(area) {
        const recommendations = [];
        const successRate = area.success_rate || 0;

        if (successRate < 30) {
            recommendations.push('Focus on fundamentals - start with easier questions');
            recommendations.push('Review basic concepts in this category');
        } else if (successRate < 50) {
            recommendations.push('Practice more questions in this category');
            recommendations.push('Identify specific patterns causing difficulty');
        } else {
            recommendations.push('Target advanced questions to improve further');
            recommendations.push('Focus on time management for this question type');
        }

        if (area.avg_time_spent && area.avg_time_spent > 120) {
            recommendations.push('Work on speed - try to solve questions faster');
        }

        return recommendations;
    }

    generateSkillSummary(skillData, weakSkills) {
        const skills = Object.keys(skillData);
        const totalSkills = skills.length;
        const analyzedSkills = skills.filter(s => skillData[s].average !== null).length;
        
        return {
            totalSkills: totalSkills,
            analyzedSkills: analyzedSkills,
            weakSkills: weakSkills.map(w => w.skill),
            averageScores: skills.reduce((acc, skill) => {
                if (skillData[skill].average !== null) {
                    acc[skill] = Math.round(skillData[skill].average);
                }
                return acc;
            }, {}),
            recommendations: `Focus on improving: ${weakSkills.map(w => w.skill).join(', ')}`
        };
    }

    generateDetailedSummary(weakAreas) {
        if (!weakAreas || weakAreas.length === 0) {
            return {
                totalWeakAreas: 0,
                averageSuccessRate: 0,
                topPriority: null,
                improving: 0,
                declining: 0
            };
        }

        const avgSuccessRate = weakAreas.reduce((sum, area) => sum + (area.success_rate || 0), 0) / weakAreas.length;
        const topPriority = weakAreas.find(area => area.priority === 'high') || weakAreas[0];

        return {
            totalWeakAreas: weakAreas.length,
            averageSuccessRate: Math.round(avgSuccessRate),
            topPriority: topPriority ? {
                category: topPriority.category,
                successRate: topPriority.success_rate,
                priority: topPriority.priority
            } : null,
            categories: [...new Set(weakAreas.map(area => area.category))]
        };
    }

    getEmptyResult(userId) {
        return {
            weakSkills: [],
            skillData: {},
            trends: {},
            recommendations: [],
            summary: {
                totalSkills: 0,
                analyzedSkills: 0,
                weakSkills: [],
                averageScores: {},
                recommendations: 'Complete more tests to identify weak areas'
            },
            metadata: {
                totalAttempts: 0,
                filters: {},
                generatedAt: new Date().toISOString()
            }
        };
    }

    // ==================== VALIDATION ====================
    validateOptions(options) {
        const { limit, page, startDate, endDate } = options;

        if (page && (page < 1)) {
            throw new Error('Page must be at least 1');
        }

        if (limit && (limit < 1 || limit > MAX_PAGE_SIZE)) {
            throw new Error(`Limit must be between 1 and ${MAX_PAGE_SIZE}`);
        }

        if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
            throw new Error('Start date must be before end date');
        }

        if (options.minDifficulty && (options.minDifficulty < 1 || options.minDifficulty > 5)) {
            throw new Error('Minimum difficulty must be between 1 and 5');
        }

        if (options.maxDifficulty && (options.maxDifficulty < 1 || options.maxDifficulty > 5)) {
            throw new Error('Maximum difficulty must be between 1 and 5');
        }
    }

    buildFilters(userId, options) {
        const filters = { userId };

        if (options.startDate && options.endDate) {
            filters.dateFilter = true;
            filters.startDate = new Date(options.startDate);
            filters.endDate = new Date(options.endDate);
        }

        if (options.testType) {
            filters.testType = options.testType;
        }

        if (options.minDifficulty) {
            filters.minDifficulty = options.minDifficulty;
        }

        if (options.maxDifficulty) {
            filters.maxDifficulty = options.maxDifficulty;
        }

        if (options.categories && Array.isArray(options.categories)) {
            filters.categories = options.categories;
        }

        return filters;
    }

    paginateResults(data, page, limit) {
        const start = (page - 1) * limit;
        const end = start + limit;
        return data.slice(start, end);
    }

    generateCacheKey(userId, type, options) {
        const key = `weak_areas:${userId}:${type}`;
        const params = {
            page: options.page || 1,
            limit: options.limit || DEFAULT_PAGE_SIZE,
            startDate: options.startDate || '',
            endDate: options.endDate || '',
            testType: options.testType || '',
            minDifficulty: options.minDifficulty || '',
            maxDifficulty: options.maxDifficulty || '',
            categories: options.categories ? options.categories.join(',') : ''
        };
        return `${key}:${JSON.stringify(params)}`;
    }

    // ==================== CLEAR CACHE ====================
    async clearCache(userId) {
        try {
            const pattern = `weak_areas:${userId}:*`;
            await this.cache.deletePattern(pattern);
            logger.info(`Cleared weak areas cache for user ${userId}`);
        } catch (error) {
            logger.error(`Clear cache error: ${error.message}`);
        }
    }

    // ==================== GET PERFORMANCE SUMMARY ====================
    async getPerformanceSummary(userId, dateRange = '30d') {
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - this.parseDateRange(dateRange));

            const result = await this.getWeakSkills(userId, 5, {
                startDate,
                endDate,
                includeRecommendations: true,
                includeDetails: true
            });

            return {
                summary: result.summary,
                trends: result.trends,
                topWeakSkills: result.weakSkills.slice(0, 3),
                recommendations: result.recommendations.slice(0, 5),
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            logger.error(`Get performance summary error: ${error.message}`);
            throw error;
        }
    }

    parseDateRange(dateRange) {
        const mappings = {
            '7d': 7,
            '14d': 14,
            '30d': 30,
            '60d': 60,
            '90d': 90
        };
        return mappings[dateRange] || 30;
    }
}

module.exports = new WeakAreaService();