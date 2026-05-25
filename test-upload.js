const fs = require('fs');
const path = require('path');

async function uploadShipmentBatch() {
  try {
    const dirPath = path.join(__dirname, 'shipment-docs');
    
    if (!fs.existsSync(dirPath)) {
      console.error(`Error: Directory 'shipment-docs' not found! Create it and add your files.`);
      return;
    }

    const files = fs.readdirSync(dirPath);
    if (files.length === 0) {
      console.log("No files found in 'shipment-docs' folder.");
      return;
    }

    const formData = new FormData();
    console.log(`Found ${files.length} documents. Packaging batch payload...`);

    // Loop through the directory and append every file to the FormData envelope
    for (const fileName of files) {
      const filePath = path.join(dirPath, fileName);
      const fileBuffer = fs.readFileSync(filePath);
      const fileObject = new File([fileBuffer], fileName, { type: 'text/plain' });
      
      // Using 'files' as the field name array for Next.js to parse
      formData.append('files', fileObject);
    }

    console.log("Streaming document batch to Next.js API (/api/upload)...");
    const response = await fetch('http://127.0.0.1:3000/api/upload', {
      method: 'POST',
      body: formData,
    });

    const resultText = await response.text();
    console.log('\n--- SERVER BATCH RESPONSE ---');
    console.log(resultText);

  } catch (error) {
    console.error('Batch upload execution failed:', error);
  }
}

uploadShipmentBatch();