const { FHIRClient } = require('../js/fhir-client.js');

async function testFullFlow() {
    const client = new FHIRClient();
    
    // Step 1: Create a patient
    console.log('=== Step 1: Create Patient ===');
    const patientData = {
        resourceType: 'Patient',
        meta: {
            tag: [{
                system: 'http://workshop.fhir.example.org/2026',
                code: 'group1-case1-create',
                display: 'Group 1 - case1'
            }, {
                system: 'http://workshop.fhir.example.org/2026',
                code: 'workshop-2026',
                display: 'Aklan FHIR Fundamentals 2026'
            }]
        },
        identifier: [{
            use: 'secondary',
            system: 'http://workshop.fhir.example.org/group',
            value: '1'
        }],
        name: [{
            use: 'official',
            family: 'DelaCruz',
            given: ['Rico']
        }],
        gender: 'male',
        birthDate: '1992-03-15'
    };
    
    const createResponse = await client.createPatient(patientData);
    console.log('Create Status:', createResponse.status);
    console.log('Patient ID:', createResponse.data?.id);
    
    // Step 2: Facilitator searches for workshop patients
    console.log('\n=== Step 2: Facilitator Search ===');
    const searchUrl = '/Patient?_tag=http://workshop.fhir.example.org/2026|workshop-2026&_count=100';
    const searchResponse = await client.get(searchUrl);
    console.log('Search Status:', searchResponse.status);
    console.log('Total Patients:', searchResponse.data?.total);
    
    if (searchResponse.data?.entry) {
        searchResponse.data.entry.forEach((entry, i) => {
            const p = entry.resource;
            // Extract group info from tags
            const workshopTag = p.meta?.tag?.find(tag => 
                tag.system === 'http://workshop.fhir.example.org/2026' &&
                tag.code?.startsWith('group')
            );
            const groupId = workshopTag ? workshopTag.code.split('-')[0].replace('group', '') : 'unknown';
            console.log(`  ${i+1}. ID: ${p.id}, Group: ${groupId}`);
        });
    }
    
    // Step 3: Search by name (for search groups)
    console.log('\n=== Step 3: Search by Name ===');
    const nameResponse = await client.searchPatient('DelaCruz', 'Rico');
    console.log('Search Status:', nameResponse.status);
    console.log('Found:', nameResponse.data?.entry?.length || 0, 'patients');
}

testFullFlow().catch(console.error);
