
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
    // const docs = await Property.find(); // Fetch all documents

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

            docs[i] = doc; // Optional, not necessary — but valid
        }
    }

    console.log('🎉 All legacy docs updated.',docs);
}

fixOldImageSchema();