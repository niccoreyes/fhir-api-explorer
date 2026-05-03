const { FHIRClient } = require('../js/fhir-client.js');

async function testTagSearch() {
    const client = new FHIRClient();
    
    // Test with system prefix
    console.log('Test: Search by full tag (system|code)');
    const searchUrl = '/Patient?_tag=http://workshop.fhir.example.org/2026|workshop-2026&_count=100';
    try {
        const response = await client.get(searchUrl);
        console.log('Status:', response.status);
        console.log('Total:', response.data.total);
        if (response.data.entry) {
            console.log('Entries:', response.data.entry.length);
            response.data.entry.forEach((entry, i) => {
                const p = entry.resource;
                const name = p.name?.[0];
                console.log(`  ${i+1}. ID: ${p.id}, Name: ${name?.given?.join(' ')} ${name?.family}`);
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testTagSearch();
