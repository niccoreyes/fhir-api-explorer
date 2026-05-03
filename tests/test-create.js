const { FHIRClient } = require('../js/fhir-client.js');

async function testCreatePatient() {
    const client = new FHIRClient();
    
    // Test patient data similar to what the workshop would send
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
            use: 'official',
            type: {
                coding: [{
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                    code: 'MR',
                    display: 'Medical Record Number'
                }],
                text: 'Medical Record Number'
            },
            system: 'http://workshop.fhir.example.org/mr',
            value: 'TEST-001'
        }, {
            use: 'secondary',
            system: 'http://workshop.fhir.example.org/group',
            value: '1'
        }],
        name: [{
            use: 'official',
            family: 'TestPatient',
            given: ['CreateTest']
        }],
        gender: 'male',
        birthDate: '1992-03-15'
    };

    console.log('Testing createPatient...');
    console.log('Sending:', JSON.stringify(patientData, null, 2));
    
    try {
        const response = await client.createPatient(patientData);
        console.log('\nResponse:', JSON.stringify(response, null, 2));
        
        if (response.success) {
            console.log('\n✅ SUCCESS: Patient created');
            console.log('ID:', response.data.id);
            console.log('Status:', response.status);
        } else {
            console.log('\n❌ FAILED:', response.status, response.statusText);
            if (response.data && response.data.issue) {
                console.log('Issues:', JSON.stringify(response.data.issue, null, 2));
            }
        }
    } catch (error) {
        console.error('\n❌ ERROR:', error.message);
    }
}

testCreatePatient();
