const { FHIRClient } = require('../js/fhir-client.js');

async function testSearch() {
    const client = new FHIRClient();
    
    // Test 1: Search by workshop tag
    console.log('Test 1: Search by workshop tag (_tag=workshop-2026)');
    try {
        const response = await client.get('/Patient?_tag=workshop-2026&_count=100');
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
    
    // Test 2: Search for our specific test patient
    console.log('\nTest 2: Search by name (TestPatient)');
    try {
        const response = await client.searchPatient('TestPatient', 'CreateTest');
        console.log('Status:', response.status);
        console.log('Success:', response.success);
        if (response.data.entry) {
            console.log('Found:', response.data.entry.length, 'patients');
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testSearch();
