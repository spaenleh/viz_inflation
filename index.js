let dataInflation;
let selectedItems = [];
const dataFileName = 'data/inflation_data_updated.csv'
const datesList = [
    '17.05.2022',
    '01.06.2022',
    '15.06.2022',
    '01.07.2022',
    '15.07.2022',
    '31.07.2022',
    '16.08.2022',
    '01.09.2022',
    '15.09.2022',
    '01.10.2022',
    '15.10.2022'
]
let datesFormattedList = []
for (const date of datesList) {
    const dateFormatted = formatDate(date)
    datesFormattedList.push(dateFormatted)
}

function setup () {
    // Charger les données (Attention: opération asynchrone !)
    loadData();
}

function loadData() {
    // Attention, il s'agit d'une opération asynchrone !
    // Une fois les données chargées, la promise sera résolue (.then) et
    // le callback `onDataLoaded` sera appelé en passant les données en paramètre
    Promise.all([
        d3.dsv(',', dataFileName),
    ]).then(function(files){
        onDataLoaded(files)
    })
}

function onDataLoaded(data) {
    dataInflation = data[0]
    dataInflation = completeProductName(dataInflation)
    //console.log(data)
    //console.log('here', dataInflation)
    dataInflation = sortData(dataInflation)
    showGrid(dataInflation)
    generateReceiptDetails()
    setTimeout(RTSInfoMisc.resize(), 200);
    //showItemDetails(null, 'vin_blanc_migros')
}

// filter products to show only those in the selected category
function filterProducts() {
    const selectedCategory = document.getElementById('filterCategory').value
    const selectedShop = document.getElementById('filterShop').value

    if (selectedCategory === 'all' && selectedShop === 'all') {
        showGrid(dataInflation)
    } else if (selectedShop === 'all') {
        let filteredData = dataInflation.filter(function (elem) {
            return elem['category'] === selectedCategory;
        });
        showGrid(filteredData)
    } else if (selectedCategory === 'all') {
        let filteredData = dataInflation.filter(function (elem) {
            return elem['shop'] === selectedShop;
        });
        showGrid(filteredData)
    } else {
        let filteredData = dataInflation.filter(function (elem) {
            return elem['shop'] === selectedShop;
        });
        filteredData = filteredData.filter(function (elem) {
            return elem['category'] === selectedCategory;
        });
        showGrid(filteredData)
    }
    RTSInfoMisc.resize();
}

function completeProductName(data) {
    for (let i = 0; i < data.length; i++) {
        const productItem = data[i]
        let productName = productItem['product_short']
        const productFull = productItem['product_full']

        if (!productName) {
            productName = productFull
            data[i]['product_short'] = productName
        }
    }
    return data
}

// sort data by product name
function sortData(data) {
    // sort by name
    data.sort((a, b) => {
        const nameA = a['product_short'].toUpperCase(); // ignore upper and lowercase
        const nameB = b['product_short'].toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        // names must be equal
        return 0;
    });

    return data
}

function showGrid(data) {
    let gridHTML = '';

    for (let i = 0; i < data.length; i++) {
        const productItem = data[i]
        const productID = productItem['product_id']
        let productName = productItem['product_short']
        const productFull = productItem['product_full']
        let productShop = productItem['shop']
        const productIcon = productItem['icon_id']
        let itemClass;
        let iconClass = "grid-icon";

        //console.log(productName)

        // show selected items as selected when changing the grid
        if (selectedItems.includes(productID)) {
            itemClass = "grid-item selected-item"
            //iconClass = "grid-icon selected-item"
        } else {
            itemClass = "grid-item"
            //iconClass = "grid-icon"
        }

        // get image filename for given shop
        if (productShop === 'Migros') {
            productShop = 'shop_migros.png'
        } else if (productShop === 'Coop') {
            productShop = 'shop_coop.png'
        }

        if (productID) {
            gridHTML += `
                <div class="${itemClass}" onclick="clickedItem(event, '${productID}')" id="${productID}">
                    <img 
                        class="grid-info" 
                        role="button" 
                        onclick="showItemDetails(event, '${productID}')" 
                        src="images/info.svg"
                        alt="info icon">
                    <img class="grid-shop" src="images/${productShop}" alt="${productShop}">
                    <img class="${iconClass}" src="images/${productIcon}.png" alt="${productID}">
                    <div class="grid-label">${productName}</div>
                </div>`
        }
    }

    gridHTML += `
        <div id="overlay"></div>
            
        <div id="details-container">
            <button id="close-button" onclick="closeItemDetails()">X</button>
            <div id="details-grid"></div>
            <div id="details-table"></div>
            <div id="price-box"></div>
            <div id="price-chart"></div>
        </div>
    `
    document.getElementById('grid-container').innerHTML = gridHTML
    resizeLabelText()
}

function showItemDetails(event, elem) {
    if (event) {
        // prevent parent div to listen to click event
        event.stopPropagation()
    }

    document.getElementById('overlay-v2').style.display = 'block'
    document.getElementById('details-container').style.display = 'block'

    console.log('clicked', elem)
    const itemData = getItemData(elem)

    const nameFull = itemData['product_full']
    let brand = itemData['brand']
    const quantity = itemData['quantity']
    const shop = 'shop_' + itemData['shop'].toLowerCase()
    const icon = itemData['icon_id']
    const url = itemData['url']
    const attribution = itemData['attribution']

    if (!brand) {
        brand = '<span class="details-no-brand">Aucune</span>'
    }

    const itemIconLoc = document.getElementById('item-icon')
    //itemIconLoc.innerHTML = `<img src="images/${icon}.png" alt="">`

    const detailsGridLoc = document.getElementById('details-grid')
    /*
    detailsGridLoc.innerHTML = `
        <div id="details-grid-icon">
            <img src="images/${icon}.png" alt="">
        </div>
        <div class="details-grid-data">
            <span class="details-grid-label">Produit</span><br>
            <span class="details-grid-value">${nameFull}</span>
        </div>
        <div class="details-grid-data">
            <span class="details-grid-label">Quantité</span><br>
            <span class="details-grid-value">${quantity}</span>
        </div>
        <div></div>
        <div class="details-grid-data">
            <span class="details-grid-label">Marque</span><br>
            <span class="details-grid-value">${brand}</span>
        </div>
        <div class="details-grid-data">
            <span class="details-grid-label">Magasin</span><br>
            <span class="details-grid-value">
                <a href=${url} target="_blank" rel="noopener noreferrer">
                    <img src="images/${shop}.png" alt="${shop}">
                    <img id="new-window-icon" src="images/new_window.svg" alt="">
                </a>
            </span>
        </div>
    `

     */


    const detailsTableLoc = document.getElementById('details-table')
    detailsTableLoc.innerHTML = `
        <table>
            <tr>
                <td rowspan="4" id="details-table-icon">
                    <img src="images/${icon}.png" alt="${icon}" id="tooltip">
                    <div id="tooltiptext">
                        © ${attribution}
                    </div>
                </td>
                <td class="details-table-label">Produit</td>
                <td class="details-table-label">Quantité</td>
            </tr>
            <tr>
                <td class="details-table-value">${nameFull}</td>
                <td class="details-table-value">${quantity}</td>
            </tr>
            <tr>
                <td class="details-table-label">Marque</td>
                <td class="details-table-label">Magasin</td>
            </tr>
            <tr>
                <td class="details-table-value">${brand}</td>
                <td class="details-table-value">
                    <a href=${url} target="_blank" rel="noopener noreferrer">
                        <img src="images/${shop}.png" alt="${shop}">
                        <img id="new-window-icon" src="images/new_window.svg" alt="">
                    </a>
                </td>
            </tr>
        </table>
    `

    const itemPrices = getItemPrices(itemData)
    const itemEarliestPrice = getItemEarliestPrice(itemPrices)
    const itemLatestPrice = getItemLatestPrice(itemPrices)
    let priceDiff = (itemLatestPrice - itemEarliestPrice).toFixed(2)
    let percentDiff = Math.round(itemLatestPrice / itemEarliestPrice * 100 - 100)

    let changeClass = ''
    if (priceDiff > 0) {
        changeClass = 'price-increased'
        priceDiff = "+" + priceDiff
        percentDiff = "+" + percentDiff
    } else if (priceDiff < 0) {
        changeClass = 'price-decreased'
    }

    const priceBoxLoc = document.getElementById('price-box')
    /*
    priceBoxLoc.innerHTML = `
        <div class="price-details">
            <div class="price-label">Prix initial</div>
            <div class="price-value">${itemEarliestPrice} CHF</div>
        </div>
        <div class="price-details">
            <div class="price-label">Prix actuel</div>
            <div class="price-value">${itemLatestPrice} CHF</div>
        </div>
        <div class="price-details">
            <div class="price-label">Evol. du prix</div>
            <div class="price-value ${changeClass}">${priceDiff} CHF</div>
        </div>
        <div class="price-details">
            <div class="price-label">Evol. en %</div>
            <div class="price-value ${changeClass}">${percentDiff} %</div>
        </div>
    `
     */

    priceBoxLoc.innerHTML = `
        <table id="price-table">
            <tr>
                <td class="price-table-label">Prix initial</td>
                <td class="price-table-label">Prix actuel</td>
                <td class="price-table-label" colspan="2">Evol. du prix</td>
            </tr>
            <tr>
                <td class="price-table-value">${itemEarliestPrice} CHF</td>
                <td class="price-table-value">${itemLatestPrice} CHF</td>
                <td class="price-table-value ${changeClass}">${priceDiff} CHF</td>
                <td class="price-table-value ${changeClass}">${percentDiff} %</td>
            </tr>
        </table>
    `

    createPlotlyChart('price-chart', itemPrices, changeClass)

    // get position of clicked item to position the details container accordingly
    let pos = event.target.getClientRects()[0];
    let top = pos.top;
    console.log(pos, top)

    let detailsContainerHeight = document.getElementById('details-container').offsetHeight;
    let windowHeight = window.innerHeight
    console.log(top, detailsContainerHeight, windowHeight)

    if (top < 0) {
        top = 10
    }

    if (top + detailsContainerHeight > windowHeight) {
        top = windowHeight - detailsContainerHeight - 10
    }

    document.getElementById('details-container').style.top = top + 'px'

    RTSInfoMisc.resize()
}

function createPlotlyChart(chartDiv, itemPrices, changeClass) {
    let lineColor = 'black'
    if (changeClass === 'price-increased') {
        lineColor = 'red'
    } else if (changeClass === 'price-decreased') {
        lineColor = 'green'
    }

    let itemPriceList = Object.values(itemPrices)
    let minPrice = Math.min(...itemPriceList)
    let maxPrice = Math.max(...itemPriceList)
    let minRange = Math.max(0, minPrice - (minPrice * 0.1))
    let maxRange = maxPrice + (minPrice * 0.1)

    let itemDateList = [];

    let windowHeight = window.innerHeight
    let chartHeight = windowHeight * 0.3

    if (chartHeight > 290) {
        chartHeight = 290
    } else if (chartHeight < 150) {
        chartHeight = 150
    }

    console.log(windowHeight)

    for (const date of Object.keys(itemPrices)) {
        const dateFormatted = formatDate(date)
        itemDateList.push(dateFormatted)
    }

    let data = [{
        x: itemDateList,
        y: itemPriceList,
        type: 'scatter',
        marker: {
            color: lineColor,
        },
        hovertemplate: '<b>Prix: %{y:.2f} CHF</b><br><i>Date: %{x}</i><br><extra></extra>',
        showlegend: false,
    }];

    let layout = {
        autosize: true,
        height: chartHeight,
        margin: {
            l: 0,
            r: 25,
            b: 0,
            t: 0,
            pad: 0
        },
        xaxis: {
            automargin: true,
            tickformat: '%d.%m.%y',
            tickvals: itemDateList,
            fixedrange: true
        },
        yaxis: {
            automargin: true,
            tickformat: '.2f',
            ticksuffix: ' CHF',
            range: [minRange, maxRange],
            fixedrange: true
        },
        hoverlabel: { bgcolor: "#FFF" },
    }

    let config = {
        displayModeBar: false,
    }

    Plotly.newPlot(chartDiv, data, layout, config);
}

function closeItemDetails() {
    document.getElementById('overlay-v2').style.display = 'none'
    document.getElementById('details-container').style.display = 'none'
}

// resize labels in the grid according to the width of the grid so the labels don't overflow
function resizeLabelText() {
    Array.from(document.getElementsByClassName('grid-label')).forEach((label) => {
        fitText(label, 0.8)
    })
}

function clickedItem(event, elem) {
    console.log('before ', selectedItems)

    if (!selectedItems.includes(elem)) {
        selectedItems.push(elem)
        populateReceipt()
        event.currentTarget.className = "grid-item selected-item"
    } else {
        selectedItems = selectedItems.filter(item => item !== elem)
        populateReceipt()
        event.currentTarget.className = "grid-item"
    }

    console.log('after ', selectedItems)
}

function getItemData(item) {
    for (const i in dataInflation) {
        const itemObject = dataInflation[i]
        if (itemObject['product_id'] === item) {
            console.log(itemObject)
            return itemObject
        } else {
            console.log('item not found')
        }
    }
}

function getItemPrices(data) {
    let priceList = {};

    for (const label in data) {
        if (datesList.includes(label)) {
            const dataValue = data[label]
            if (dataValue) {
                priceList[label] = parseFloat(dataValue).toFixed(2)
            }
        }
    }
    return priceList
}

function getItemEarliestPrice(priceData) {
    for (const i in datesList) {
        const date = datesList[i]
        if (priceData[date]) {
            return priceData[date]
        }
    }
}

function getItemLatestPrice(priceData) {
    for (let i = datesList.length - 1; i > -1 ; i--) {
        const date = datesList[i]
        if (priceData[date]) {
            return priceData[date]
        }
    }
}

function selectAll() {
    let itemsList = document.getElementsByClassName('grid-item')
    //console.log(itemsList)

    for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i]
        //console.log(item)
        const productID = item.id

        if (!selectedItems.includes(productID)) {
            selectedItems.push(productID)
            populateReceipt()
            item.className = "grid-item selected-item"
        }
    }
}

function clearSelection() {
    selectedItems = []
    const itemsInGrid = document.getElementsByClassName('grid-item')
    const itemsOnReceipt = document.getElementById('receipt-items')
    const evolutionOnReceipt = document.getElementById('receipt-evolution')

    Array.from(itemsInGrid).forEach((item) => {
        // Do stuff here
        item.className = "grid-item"
    });

    itemsOnReceipt.innerHTML = 'Aucun produit sélectionné'
    evolutionOnReceipt.innerHTML = ''
    console.log(selectedItems)
}

function formatDate(date) {
    const [day, month, year] = date.split('.')
    const dateFormatted = new Date(+year, +month - 1, +day);  // month from 0 (jan) to 11 (dec)
    return dateFormatted
}

function generateReceiptDetails() {

    // get today's date for receipt
    const dateOnReceipt = document.getElementById('receipt-date')
    let d = new Date()
    let minute = d.getMinutes()
    let hour = d.getHours()
    let day = d.getDate()
    let month = d.getMonth() + 1
    let year = d.getFullYear()

    if (minute < 10) {
        minute = '0' + minute
    }

    dateOnReceipt.innerHTML = `${hour}:${minute} - ${day}.${month}.${year}`

    // generate random barcode for receipt
    function randomMinMax(min, max) {
        return Math.floor(Math.random() * max) + min;
    }
    //make 18 digit barcode
    // 4 4 4 4 2
    document.getElementById('receipt-barcode').innerHTML = `
        ${randomMinMax(1000, 9000)}
        ${randomMinMax(1000, 9000)}
        ${randomMinMax(1000, 9000)}
        ${randomMinMax(1000, 9000)}
        ${randomMinMax(10, 90)}`
}

function populateReceipt() {
    const itemsOnReceipt = document.getElementById('receipt-items')
    const evolutionOnReceipt = document.getElementById('receipt-evolution')
    console.log(selectedItems)

    if (selectedItems.length > 0) {
        const sortedSelectedItems = selectedItems.sort()
        let totalEarliestPrice = 0
        let totalLatestPrice = 0
        let totalDiffPrice = 0
        let totalMigrosEarliestPrice = 0
        let totalMigrosLatestPrice = 0
        let totalCoopEarliestPrice = 0
        let totalCoopLatestPrice = 0

        let itemsCoopNbr = 0
        let itemsMigrosNbr = 0
        let itemsCoopHTML = ''
        let itemsCoopHeadHTML = ''
        let itemsMigrosHTML = ''
        let itemsMigrosHeadHTML = ''

        let itemsHTML = `
            <table id="receipt-table-items">
                <tr class="receipt-item-header">
                    <th class="receipt-item-name"></th>
                    <th class="receipt-item-price">Prix<br>actuel<br>15.10.22</th>
                    <th class="receipt-item-price">Evol.<br>depuis<br>17.05.22</th>
                </tr>`

        for (let i = 0; i < sortedSelectedItems.length; i++) {
            const item = selectedItems[i]
            const itemData = dataInflation.find(({ product_id }) => product_id === item);
            const itemShop = itemData['shop']
            const itemPrices = getItemPrices(itemData)
            const itemEarliestPrice = parseFloat(getItemEarliestPrice(itemPrices))
            const itemLatestPrice = parseFloat(getItemLatestPrice(itemPrices))
            let itemDiffPrice = itemLatestPrice - itemEarliestPrice

            totalDiffPrice += itemDiffPrice
            totalEarliestPrice += itemEarliestPrice
            totalLatestPrice += itemLatestPrice
            itemDiffPrice = formatPrice(itemDiffPrice)

            if (itemShop === 'Coop') {
                //console.log(itemsCoopNbr)
                itemsCoopHTML += `
                    <tr>
                        <td class="receipt-item-name">${itemData.product_short}</td>
                        <td class="receipt-item-price">${itemLatestPrice.toFixed(2)}</td>
                        <td class="receipt-item-price">${itemDiffPrice}</td>
                    </tr>`

                totalCoopEarliestPrice += itemEarliestPrice
                totalCoopLatestPrice += itemLatestPrice
                itemsCoopNbr += 1
            } else if (itemShop === 'Migros') {
                //console.log(itemsMigrosNbr)

                itemsMigrosHTML += `
                    <tr>
                        <td class="receipt-item-name">${itemData.product_short}</td>
                        <td class="receipt-item-price">${itemLatestPrice.toFixed(2)}</td>
                        <td class="receipt-item-price">${itemDiffPrice}</td>
                    </tr>`

                totalMigrosEarliestPrice += itemEarliestPrice
                totalMigrosLatestPrice += itemLatestPrice
                itemsMigrosNbr += 1
            }
        }

        if (itemsCoopNbr > 0 && itemsMigrosNbr > 0) {
            itemsCoopHeadHTML +=  `
                <tr>
                    <td class="receipt-item-name">-- COOP --</td>
                </tr>`
            itemsMigrosHeadHTML +=  `
                        <tr>
                            <td class="receipt-item-shop">-- MIGROS --</td>
                        </tr>`
        }

        itemsHTML += itemsCoopHeadHTML
        itemsHTML += itemsCoopHTML
        itemsHTML += itemsMigrosHeadHTML
        itemsHTML += itemsMigrosHTML

        totalDiffPrice = formatPrice(totalDiffPrice)

        // total row
        itemsHTML += `
            <tr class="receipt-total-row">
                <td>TOTAL</td>
                <td>${totalLatestPrice.toFixed(2)}</td>
                <td>${totalDiffPrice}</td>
            </tr>
            </table>`

        itemsOnReceipt.innerHTML = itemsHTML

        // evolution section
        const priceDiff = (totalLatestPrice - totalEarliestPrice).toFixed(2)
        const percentDiff = Math.round(totalLatestPrice / totalEarliestPrice * 100 - 100)
        const priceDiffCoop = (totalCoopLatestPrice - totalCoopEarliestPrice).toFixed(2)
        const percentDiffCoop = Math.round(totalCoopLatestPrice / totalCoopEarliestPrice * 100 - 100)
        const priceDiffMigros = (totalMigrosLatestPrice - totalMigrosEarliestPrice).toFixed(2)
        const percentDiffMigros = Math.round(totalMigrosLatestPrice / totalMigrosEarliestPrice * 100 - 100)

        let evolutionHTML = `
            <div>- - - - - - - - - - - - - - - - - - -</div>
            <table id="receipt-table-evolution">
                <tr>
                    <td class="receipt-evolution-name">EVOLUTION DU PRIX</td>
                </tr>`

        if (itemsCoopNbr > 0 && itemsMigrosNbr > 0) {
            evolutionHTML += `
                <tr>
                    <td class="receipt-evolution-name">Différence Coop</td>
                    <td class="receipt-evolution-price">${priceDiffCoop} CHF</td>
                    <td class="receipt-evolution-price">${percentDiffCoop} %</td>
                </tr>
                <tr>
                    <td class="receipt-evolution-name">Différence Migros</td>
                    <td class="receipt-evolution-price">${priceDiffMigros} CHF</td>
                    <td class="receipt-evolution-price">${percentDiffMigros} %</td>
                </tr>`
        }

        evolutionHTML += `
                <tr class="receipt-total-row">
                    <td>TOTAL</td>
                    <td>${priceDiff} CHF</td>
                    <td>${percentDiff} %</td>
                </tr>`

        evolutionOnReceipt.innerHTML = evolutionHTML + '</table>'
    } else {
        itemsOnReceipt.innerHTML = 'Aucun produit sélectionné'
        evolutionOnReceipt.innerHTML = ''
    }
    RTSInfoMisc.resize();
}

function formatPrice(price) {
    if (price > 0) {
        price = price.toFixed(2)
        price = "+" + price
    } else if (price === 0) {
        price = '---'
    } else {
        price = price.toFixed(2)
    }

    return price
}

function switchMobileView(checkbox) {
    const gridOnPage = document.getElementById('grid-container')
    const receiptOnPage = document.getElementById('receipt')

    if (checkbox.checked === true) {
        gridOnPage.style.display = 'none'
        receiptOnPage.style.display = 'block'
        RTSInfoMisc.resize();
    } else {
        gridOnPage.style.display = 'grid'
        receiptOnPage.style.display = 'none'
        RTSInfoMisc.resize();
    }
}



setup()