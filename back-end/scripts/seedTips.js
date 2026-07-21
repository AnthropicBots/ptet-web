// scripts/seedTips.js (run once)
const { Tip, sequelize } = require('../src/models');
const { Op } = require('sequelize');

// Tips data with unique identifiers for better duplicate detection
const tips = [
  { 
    content: "Practice speaking for at least 15 minutes every day to build fluency.", 
    category: "Speaking",
    source: "Expert Recommendation"
  },
  { 
    content: "Use the 'Read Aloud' technique to improve pronunciation and intonation.", 
    category: "Speaking",
    source: "Language Learning"
  },
  { 
    content: "For writing tasks, always plan your essay structure before you start writing.", 
    category: "Writing",
    source: "Test Preparation"
  },
  { 
    content: "Read English newspapers daily to improve reading speed and comprehension.", 
    category: "Reading",
    source: "Study Tips"
  },
  { 
    content: "Listen to podcasts in English with transcripts to enhance listening skills.", 
    category: "Listening",
    source: "Language Learning"
  },
  // Additional tips
  { 
    content: "Record your speaking practice and listen back to identify areas for improvement.", 
    category: "Speaking",
    source: "Self-Study"
  },
  { 
    content: "Learn 5 new vocabulary words daily and use them in sentences.", 
    category: "Vocabulary",
    source: "Learning Strategy"
  },
  { 
    content: "Practice summarizing articles in 60 seconds to improve conciseness.", 
    category: "Writing",
    source: "Test Preparation"
  },
  { 
    content: "Read questions before reading passages to save time.", 
    category: "Reading",
    source: "Test Strategy"
  },
  { 
    content: "Listen to different English accents (British, American, Australian) for better comprehension.", 
    category: "Listening",
    source: "Expert Recommendation"
  },
  // ... add more
];

/**
 * Check if a tip already exists in the database
 * @param {string} content - Tip content to check
 * @param {string} category - Tip category
 * @returns {Promise<boolean>} - True if exists, false otherwise
 */
async function tipExists(content, category) {
  try {
    const existingTip = await Tip.findOne({
      where: {
        content: content,
        category: category
      }
    });
    return existingTip !== null;
  } catch (error) {
    console.error('Error checking tip existence:', error);
    return false;
  }
}

/**
 * Seed tips with duplicate checking
 * @param {Array} tipsData - Array of tip objects
 * @returns {Promise<Object>} - Statistics about the seeding process
 */
async function seedTipsWithDuplicateCheck(tipsData) {
  const stats = {
    total: tipsData.length,
    inserted: 0,
    skipped: 0,
    errors: 0,
    duplicateDetails: []
  };

  console.log(`\nStarting seeding process...`);
  console.log(`Total tips to process: ${stats.total}\n`);

  for (let i = 0; i < tipsData.length; i++) {
    const tip = tipsData[i];
    try {
      // Check if tip already exists
      const exists = await tipExists(tip.content, tip.category);
      
      if (exists) {
        console.log(`Skipping duplicate tip: "${tip.content.substring(0, 50)}..."`);
        stats.skipped++;
        stats.duplicateDetails.push({
          content: tip.content,
          category: tip.category
        });
      } else {
        // Insert new tip
        await Tip.create(tip);
        console.log(`Inserted new tip: "${tip.content.substring(0, 50)}..."`);
        stats.inserted++;
      }
    } catch (error) {
      console.error(`Error processing tip: "${tip.content.substring(0, 50)}..."`, error);
      stats.errors++;
    }
  }

  return stats;
}

/**
 * Alternative bulk method using findOrCreate (more efficient for large datasets)
 */
async function seedTipsBulkWithDuplicateCheck(tipsData) {
  const stats = {
    total: tipsData.length,
    inserted: 0,
    skipped: 0,
    errors: 0
  };

  console.log(`\nStarting bulk seeding process...`);
  console.log(`Total tips to process: ${stats.total}\n`);

  try {
    // Get all existing tips to check against
    const existingTips = await Tip.findAll({
      attributes: ['content', 'category']
    });

    // Create a Set of existing tips for quick lookup
    const existingSet = new Set();
    existingTips.forEach(tip => {
      existingSet.add(`${tip.content}|${tip.category}`);
    });

    // Filter out tips that already exist
    const newTips = tipsData.filter(tip => {
      const key = `${tip.content}|${tip.category}`;
      const exists = existingSet.has(key);
      if (exists) {
        console.log(`Skipping duplicate tip: "${tip.content.substring(0, 50)}..."`);
        stats.skipped++;
      }
      return !exists;
    });

    // Insert all new tips in bulk
    if (newTips.length > 0) {
      console.log(`\nInserting ${newTips.length} new tips...`);
      await Tip.bulkCreate(newTips);
      stats.inserted = newTips.length;
      console.log(`Successfully inserted ${newTips.length} tips`);
    } else {
      console.log(`No new tips to insert`);
    }

  } catch (error) {
    console.error('Error in bulk seeding:', error);
    stats.errors++;
  }

  return stats;
}

/**
 * Main seeding function with both approaches
 */
async function seedTips() {
  try {
    console.log('\nStarting Tip Seeding Script');
    console.log('================================\n');

    // Option 1: Sequential approach (slower but more detailed)
    console.log('Using sequential approach...');
    const sequentialStats = await seedTipsWithDuplicateCheck(tips);
    
    // Display statistics
    console.log('\nSeeding Summary:');
    console.log('================================');
    console.log(`Total tips: ${sequentialStats.total}`);
    console.log(`Inserted: ${sequentialStats.inserted}`);
    console.log(`Skipped (duplicates): ${sequentialStats.skipped}`);
    console.log(`Errors: ${sequentialStats.errors}`);
    
    if (sequentialStats.duplicateDetails.length > 0) {
      console.log('\nDuplicate Tips Found:');
      sequentialStats.duplicateDetails.forEach((dup, index) => {
        console.log(`  ${index + 1}. [${dup.category}] ${dup.content.substring(0, 60)}...`);
      });
    }

    // Option 2: Bulk approach (commented out by default - more efficient for large datasets)
    // Uncomment below if you prefer bulk approach
    /*
    console.log('\nUsing bulk approach...');
    const bulkStats = await seedTipsBulkWithDuplicateCheck(tips);
    
    console.log('\nBulk Seeding Summary:');
    console.log('================================');
    console.log(`Total tips: ${bulkStats.total}`);
    console.log(`Inserted: ${bulkStats.inserted}`);
    console.log(`Skipped (duplicates): ${bulkStats.skipped}`);
    console.log(`Errors: ${bulkStats.errors}`);
    */

    console.log('\nSeeding completed successfully!');
    console.log('================================\n');

  } catch (error) {
    console.error('\nSeeding failed:', error);
    process.exit(1);
  }
}

// Run the seeding function
(async () => {
  try {
    // Sync database
    await sequelize.sync();
    console.log('Database synchronized');
    
    // Run seeding
    await seedTips();
    
    console.log('Tip seeding script completed!');
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();

// Export for testing
module.exports = {
  seedTips,
  seedTipsWithDuplicateCheck,
  seedTipsBulkWithDuplicateCheck,
  tipExists,
  tips
};