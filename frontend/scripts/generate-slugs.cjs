const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

const results = new Set();
const csvPath = path.resolve(__dirname, '../../statcan_18100245_extracted/18100245.csv');

fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (data) => {
        // Use the 'Products' column for slugs
        if (data.Products) {
            const slug = data.Products
                .toLowerCase()
                .replace(/\s+/g, '-')
            results.add(slug);
        }
    })
    .on('end', () => {
        const outputPath = path.resolve(__dirname, '../src/lib/product-slugs.json');
        fs.writeFileSync(outputPath, JSON.stringify([...results], null, 2));
        console.log('Slugs generated!');
    }); 