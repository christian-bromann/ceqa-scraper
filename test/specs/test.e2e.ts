import { writeFile } from 'node:fs'
import { Buffer } from 'node:buffer'

import { browser, $ } from '@wdio/globals'
import { mkConfig, generateCsv, asString } from 'export-to-csv'

describe('My Login application', () => {
    const csvConfig = mkConfig({ useKeysAsHeaders: true })
    const data: Record<string, string>[] = []

    async function getSectionValue (label: string, container: WebdriverIO.Element) {
        const scope = container ? container : $('body')
        const labelElement = await scope.$('strong=' + label)
        if (!(await labelElement.isExisting())) {
            return 'N/A'
        }
        const section = labelElement.parentElement().parentElement().$('.col-md-9')
        return await section.getText()
    }

    beforeEach(async () => {
        await browser.url(`https://ceqanet.opr.ca.gov/Search?DocumentType=NOP+-+Notice+of+Preparation+of+a+Draft+EIR&ProjectIssue=Greenhouse+Gas+Emissions&DevelopmentType=Office`)
    })

    it('should login with valid credentials', async () => {
        await browser.url(`https://ceqanet.opr.ca.gov/Search?DocumentType=NOP+-+Notice+of+Preparation+of+a+Draft+EIR&ProjectIssue=Greenhouse+Gas+Emissions&DevelopmentType=Office`)
        const nopButtons = await $$('span=NOP').getElements()
        const nopButtonsLength = nopButtons.length

        for (let i = 0; i < nopButtonsLength; i++) {
            const row = {}
            const nopButtons = await $$('span=NOP').getElements()
            await nopButtons[i].click()

            const projectName = await $('h1').getText()
            console.log(projectName);

            const summaryContainer = await $('h2=Summary').nextElement().getElement()
            const [schNumber, leadAgency, documentTitle, documentType, received, presentLandUse, documentDescription] = await Promise.all([
                getSectionValue('SCH Number', summaryContainer),
                getSectionValue('Lead Agency', summaryContainer),
                getSectionValue('Document Title', summaryContainer),
                getSectionValue('Document Type', summaryContainer),
                getSectionValue('Received', summaryContainer),
                getSectionValue('Present Land Use', summaryContainer),
                getSectionValue('Document Description', summaryContainer),
            ]);

            Object.assign(row, {
                'SCH Number': schNumber,
                'Lead Agency': leadAgency,
                'Document Title': documentTitle,
                'Document Type': documentType,
                'Received': received,
                'Present Land Use': presentLandUse,
                'Document Description': documentDescription
            })

            const container: WebdriverIO.Element[] = []
            let nextElement = await $('h2=Contact Information').getElement()
            while (true) {
                nextElement = await nextElement.nextElement().getElement()
                const tagName = await nextElement.getTagName()
                if (tagName === 'div') {
                    container.push(nextElement)
                }
                if (tagName === 'h2') {
                    break
                }
            }

            for (const [i, element] of Object.entries(container)) {
                const [name, agencyName, jobTitle, contactTypes, address, phone, email] = await Promise.all([
                    getSectionValue('Name', element),
                    getSectionValue('Agency Name', element),
                    getSectionValue('Job Title', element),
                    getSectionValue('Contact Types', element),
                    getSectionValue('Address', element),
                    getSectionValue('Phone', element),
                    getSectionValue('Email', element)
                ])
                Object.assign(row, {
                    [`Name #${parseInt(i) + 1}`]: name,
                    [`Agency Name #${parseInt(i) + 1}`]: agencyName,
                    [`Job Title #${parseInt(i) + 1}`]: jobTitle,
                    [`Contact Types #${parseInt(i) + 1}`]: contactTypes,
                    [`Address #${parseInt(i) + 1}`]: address,
                    [`Phone #${parseInt(i) + 1}`]: phone,
                    [`Email #${parseInt(i) + 1}`]: email
                })
            }
            

            const locationContainer = await $('h2=Location').nextElement().getElement()
            const [coordinates, cities, counties, regions, crossStreets, zip, totalAcres, parcel, stateHighways, railways, airports, waterways] = await Promise.all([
                getSectionValue('Coordinates', locationContainer),
                getSectionValue('Cities', locationContainer),
                getSectionValue('Counties', locationContainer),
                getSectionValue('Regions', locationContainer),
                getSectionValue('Cross Streets', locationContainer),
                getSectionValue('Zip', locationContainer),
                getSectionValue('Total Acres', locationContainer),
                getSectionValue('Zip', locationContainer),
                getSectionValue('Parcel #', locationContainer),
                getSectionValue('State Highways', locationContainer),
                getSectionValue('Railways', locationContainer),
                getSectionValue('Airports', locationContainer),
                getSectionValue('Waterways', locationContainer),
            ]);

            Object.assign(row, {
                'Coordinates': coordinates,
                'Cities': cities,
                'Counties': counties,
                'Regions': regions,
                'Cross Streets': crossStreets,
                'Zip': zip,
                'Total Acres': totalAcres,
                'Parcel #': parcel,
                'State Highways': stateHighways,
                'Railways': railways,
                'Airports': airports,
                'Waterways': waterways
            })

            console.log(row);
            data.push(row)
            console.log('--------------------------------');
            await browser.url(`https://ceqanet.opr.ca.gov/Search?DocumentType=NOP+-+Notice+of+Preparation+of+a+Draft+EIR&ProjectIssue=Greenhouse+Gas+Emissions&DevelopmentType=Office`)
        }

        const csv = generateCsv(csvConfig)(data);
        const filename = `${csvConfig.filename}.csv`;
        const csvBuffer = new Uint8Array(Buffer.from(asString(csv)));

        // Write the csv file to disk
        writeFile(filename, csvBuffer, (err) => {
            if (err) throw err;
            console.log("file saved: ", filename);
        })
    })

})

