const fs = require('fs');
const path = require('path');

async function backfillSlugs() {

    const docs = await Property.find({ slug: { $exists: false } });
    for (const doc of docs) {
        // re‑assign title to itself to trip your pre('save') logic:
        doc.title = doc.title;
        await doc.save();
    }
    console.log(`✅ Backfilled ${docs.length} slugs`);
}

backfillSlugs()


async function fixOldImageSchema() {
    for (let i = 0; i < docs.length; i++) {
        const doc = docs[i];

        if (Array.isArray(doc.images) && typeof doc.images[0] === 'string') {
            doc.images = doc.images.map(url => ({
                url,
                metaData: {
                    title: '',
                    description: '',
                    keywords: ''
                }
            }));

            console.log('✅ Updated doc:', doc._id);
        }
    }

    const outputPath = path.join(__dirname, 'updatedDocs.json');

    fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2));
    console.log(`🎉 All legacy docs updated and saved to: ${outputPath}`);
}

fixOldImageSchema();