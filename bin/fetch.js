const playwright = require('playwright-chromium')
const { orderBy, last } = require('lodash')
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const fs = require('fs-extra')
const yargs = require('yargs')
const path = require('path')

const opts = yargs.option('output', { required: true }).argv

const main = async () => {
    const browser = await playwright.chromium.launch({
        headless: process.env.HEADLESS !== 'false',
    })

    try {
        const context = await browser.newContext({ acceptDownloads: true })
        const page = await context.newPage()

        await page.goto('https://nextstrain.org/groups/niph')

        await page.waitForSelector('div:text("groups/niph/ncov/norway-all")')
        const links = await page.$$('div:text("groups/niph/ncov/norway-all")')
        const datasets = []

        for (const link of links) {
            const text = (await link.textContent()).trim()
            const md = text.match(/(\d{4}-\d{2}-\d{2})/)

            if (md) {
                date = md[1]
                datasets.push({ name: text, date })
            }
        }

        const latest = last(orderBy(datasets, 'date', 'asc'))
        await page.click(`div:text("${latest.name}")`)
        await page.click('text="Download data"')

        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 60000 }),
            page.click('text="Metadata (TSV)"'),
        ])

        await fs.mkdirp(path.dirname(opts.output))

        await download.saveAs(opts.output)
        await context.close()
    } catch (error) {
        console.error(error)
    } finally {
        await browser.close()
    }
}

main().catch(console.error)
