'use strict'

var http = require('http');
var port = process.env.PORT || 3001;
var request = require('request');
var qs = require('querystring');
var util = require('util');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var express = require('express');
var app = express();
var QuickBooks = require('../index');
var Tokens = require('csrf');
var csrf = new Tokens();
const csv = require('csv-parser');
const fs = require('fs');
var RateLimiter = require('limiter').RateLimiter;
var limiter = new RateLimiter(1, 1000);
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

QuickBooks.setOauthVersion('2.0');

// Generic Express config
app.set('port', port);
app.set('views', 'views');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser('brad'));
app.use(session({resave: false, saveUninitialized: false, secret: 'smith'}));

app.listen(app.get('port'), function () {
    console.log('Express server listening on port ' + app.get('port'));
});
const https = require('https');
const options = {
    cert: fs.readFileSync('./fullchain.pem'),
    key: fs.readFileSync('./privkey.pem')
};
https.createServer(options, app).listen(2055);
console.log(`https app listinging at 2055`);

// INSERT YOUR CONSUMER_KEY AND CONSUMER_SECRET HERE

var consumerKey = 'Q0medGU96jopiYEvZO3kPWD7TDsC0M1AIiTT984vcttMSUDxiP';
var consumerSecret = '94RTGwwbluu8QRS9I2zcK4wKNDGZwOk0E2oayiCM';
let qbo;

app.get('/', function (req, res) {
    res.redirect('/start');
});

app.get('/start', function (req, res) {
    res.render('intuit.ejs', {port: port, appCenter: QuickBooks.APP_CENTER_BASE});
});

// OAUTH 2 makes use of redirect requests
function generateAntiForgery(session) {
    session.secret = csrf.secretSync();
    return csrf.create(session.secret);
};

app.get('/requestToken', function (req, res) {
    var redirecturl = QuickBooks.AUTHORIZATION_URL +
        '?client_id=' + consumerKey +
        '&redirect_uri=' + encodeURIComponent('https://ck.evestemptation.com:2055/callback') +  //Make sure this path matches entry in application dashboard
        '&scope=com.intuit.quickbooks.accounting' +
        '&response_type=code' +
        '&state=' + generateAntiForgery(req.session);

    res.redirect(redirecturl);
});

app.get('/callback', function (req, res) {
    var auth = (new Buffer(consumerKey + ':' + consumerSecret).toString('base64'));

    var postBody = {
        url: 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: 'Basic ' + auth,
        },
        form: {
            grant_type: 'authorization_code',
            code: req.query.code,
            redirect_uri: 'https://ck.evestemptation.com:2055/callback'  //Make sure this path matches entry in application dashboard
        }
    };

    request.post(postBody, function (e, r, data) {
        var accessToken = JSON.parse(r.body);

        // save the access token somewhere on behalf of the logged in user
        qbo = new QuickBooks(consumerKey,
            consumerSecret,
            accessToken.access_token, /* oAuth access token */
            false, /* no token secret for oAuth 2.0 */
            req.query.realmId,
            false, /* use a sandbox account */
            true, /* turn debugging on */
            4, /* minor version */
            '2.0', /* oauth version */
            accessToken.refresh_token /* refresh token */);

        const csvWriter = createCsvWriter({
            path: 'QBO-out.csv',
            header: [
                {id: 'consumerKey', title: 'consumerKey'},
                {id: 'consumerSecret', title: 'consumerSecret'},
                {id: 'token', title: 'token'},
                {id: 'tokenSecret', title: 'tokenSecret'},
                {id: 'realmId', title: 'realmId'},
                {id: 'useSandbox', title: 'useSandbox'},
                {id: 'debug', title: 'debug'},
                {id: 'endpoint', title: 'endpoint'},
                {id: 'minorversion', title: 'minorversion'},
                {id: 'oauthversion', title: 'oauthversion'},
                {id: 'refreshToken', title: 'refreshToken'},
            ]
        });
        try {
            csvWriter.writeRecords([qbo]).then(() => console.log('The QBO-out file was written successfully'));
        } catch (e) {
            console.log(e);
        }
    });

    res.send('<!DOCTYPE html><html lang="en"><head></head><body><script>window.opener.location.reload(); window.close();</script></body></html>');
});

app.get('/test', function (req, res) {
    // qbo.findAccounts({
    //     limit: 10,
    //     offset: 10
    // }, function (err, accounts) {
    //     accounts.QueryResponse.Account.forEach(function (account) {
    //         console.log(account.Name)
    //     })
    //     res.send(`${JSON.stringify(accounts.QueryResponse)}`);
    // })

    // qbo.findItems({
    //     limit: 10,
    //     offset: 10
    // }, function (err, items) {
    //     items.QueryResponse.Item.forEach(function (item) {
    //         console.log(item.Name)
    //     })
    //     res.send(`${JSON.stringify(items.QueryResponse)}`);
    // })

    // const qbo = [{
    //     "consumerKey": "L041UcaaB3WvwzhqmEwxVevAKeEgFpdgIDJwU62vyxb1ABV4o3",
    //     "consumerSecret": "mQNUT7lYhEbQ0dx3deTrLM6FzXBEZgZaZjYPTeXi",
    //     "token": "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..75XmmUfrLaVq5hPocQhY2g.dTOCzlkkTNjIbKinEtoAtYTYoGj_fVDo9R03PEcTxE3_BECy-Yh8lEwPnAeuFsgNEx3m-0_ZO7WLmF7Uw_Ps0uyDITsMFfpfRxu7a4qVi4llk6CNtHVvpP2Fm0P7-_i04k0taJuQjtwxcE4F4pkstYEDZc4f_LnUtB5abVEPSKVkW78zyP2gtxKj2AKY2bsuiGVeih28Cc7_xX9tnBCkVMmNwAcuZvGCoR8EWScpTClImlBe904XPPMVw0GA1_Btiq9KwL3MX9Z5QVgrWWFmmIwWN68TE5_TmEImBAHsSQcAF3xLaUAFiuAzwPGHJAxSzDyuP3WKl78Gnm7wC-rz2F_IogBzXS-dEcB8K77C1lch6LPtKRxrYwF9g9y78y87GyJX2S4m2kpGN5tzDb7P9G7ebBMTOtHtAh5b2wmF26_RkuKuSmsH928FiIGILogJvygDGmWT2gcg5ENt7M7UQ7p1Ugo2Wr-FjVwIkm1Z57nMVIIV8oSi1fPrURiY8-ipNhc8n_w8h6KNoVvAlhCYPhIEZfOn7-to55QhWB_TmCmUR590Q2HkiX2BGvI_WIlj_wEknXImlSRyF84E1bSRhHnXrXVCj_kIhsntgCt87afLM59iY4gMj3k-aZTXHeT-BgY5X6SitUgGJiS5gD83KmAqgJ0P_BlVkhWtblPV4SQ.o7jinQ5UrT4t-acXrfSbeQ",
    //     "tokenSecret": false,
    //     "realmId": "193514843841774",
    //     "useSandbox": true,
    //     "debug": true,
    //     "endpoint": "https://sandbox-quickbooks.api.intuit.com/v3/company/",
    //     "minorversion": 4,
    //     "oauthversion": "2.0",
    //     "refreshToken": "L0115583961076DOMHs2YG7mX30RiKB6onkwhcs7fzhBaJ1e2p"
    // }


    fs.createReadStream('QBO-out.csv').pipe(csv()).on('data', (row) => {
        qbo = new QuickBooks(
            row.consumerKey,
            row.consumerSecret,
            row.token,
            false, /* no token secret for oAuth 2.0 */
            row.realmId, /*realmId*/
            false, /* use a sandbox account */
            true, /* turn debugging on */
            4, /* minor version */
            '2.0' /* oauth version */
        );

        qbo.findPurchaseOrders({
            "DocNumber": "POI-10"
        }, function (err, TempPurchaseOrders) {
            if (err) {
                res.send(`${JSON.stringify(err)}`);
            } else {
                let PurchaseOrders = TempPurchaseOrders.QueryResponse.PurchaseOrder;
                res.send(`${JSON.stringify(PurchaseOrders)}`);
            }
        });
    });


    //ImportNewItems from CSV File
    // fs.createReadStream('data.csv').pipe(csv()).on('data', (row) => {
    //     limiter.removeTokens(1, function (err, remainingRequests) {
    //         console.log(JSON.stringify(row));
    //         qbo.createItem({
    //             "TrackQtyOnHand": true,
    //             "Name": row['Product/Service Name'],
    //             "QtyOnHand": row['Quantity On Hand'],
    //             "Sku": row.SKU,
    //             "IncomeAccountRef": {
    //                 "name": "Sales of Product Income",
    //                 "value": "79"
    //             },
    //             "AssetAccountRef": {
    //                 "name": "Inventory Asset",
    //                 "value": "81"
    //             },
    //             "InvStartDate": "2019-01-01",
    //             "Type": "Inventory",
    //             "ExpenseAccountRef": {
    //                 "name": "Cost of Goods Sold",
    //                 "value": "80"
    //             }
    //         }, (err, Item) => {
    //             if (err) {
    //                 console.log(JSON.stringify(err));
    //             } else {
    //                 console.log(JSON.stringify(Item));
    //             }
    //         });
    //     });
    // });

    InventoryCycleCount
    qbo.findItems({
        "Sku": "1031320016-L"
    }, (err, item) => {
        if (err) {
            console.log(JSON.stringify(err));
        } else {
            let ItemToUpdate = item.QueryResponse.Item[0];
            ItemToUpdate.QtyOnHand = 50;
            try {
                qbo.updateItem(ItemToUpdate, (err, updatedItem) => {
                    if (err) {
                        console.log(JSON.stringify(err));
                    } else {
                        res.send(JSON.stringify(updatedItem));
                    }
                });
            } catch (e) {
                console.log(e);
            }
        }
    });

});

app.get('/item', (req, res) => {
    let totalItemNum = 39;
    let importedItemNum = 0;
    let ErrorMessages = [];
    let FailedItemWriter = createCsvWriter({
        path: 'FailedItem.csv',
        header: [
            {id: 'SKU', title: 'SKU'},
            {id: 'message', title: 'message'}
        ]
    });
    // Authorization
    fs.createReadStream('QBO-out.csv').pipe(csv()).on('data', (row) => {
        qbo = new QuickBooks(
            row.consumerKey,
            row.consumerSecret,
            row.token,
            false, /* no token secret for oAuth 2.0 */
            row.realmId,
            false, /* use a sandbox account */
            false, /* turn debugging on */
            4, /* minor version */
            '2.0', /* oauth version */
            row.refreshToken
        );
    });

    //ImportNewItems from CSV File
    fs.createReadStream('data.csv').pipe(csv()).on('data', (row) => {
        limiter.removeTokens(1, function (err, remainingRequests) {
            //console.log(JSON.stringify(row));
            try {
                qbo.createItem({
                    "TrackQtyOnHand": true,
                    "Name": row['Product/Service Name'],
                    "QtyOnHand": row['Quantity On Hand'],
                    "Sku": row.SKU,
                    "IncomeAccountRef": {
                        "name": "Sales of Product Income",
                        "value": "34"
                    },
                    "AssetAccountRef": {
                        "name": "Inventory Asset",
                        "value": "35"
                    },
                    "InvStartDate": "2019-01-01",
                    "Type": "Inventory",
                    "ExpenseAccountRef": {
                        "name": "Cost of Goods Sold",
                        "value": "26"
                    },
                    "PurchaseCost": row['Purchase Cost']
                }, (err, Item) => {
                    if (err) {
                        importedItemNum += 1;
                        let ErrorMessage = {
                            SKU: row.SKU,
                            message: `Unable to create the ${importedItemNum} Item: ${row['Product/Service Name']}. Error: ${JSON.stringify(err)}`
                        };
                        ErrorMessages.push(ErrorMessage);
                        // if (err.Fault.Error[0].code !== '6240') {
                        //     console.log(ErrorMessage);
                        // }
                        console.log(`Imported ${importedItemNum} item(s). Error: ${JSON.stringify(ErrorMessage)}`);
                    } else {
                        importedItemNum += 1;
                        console.log(`Imported ${importedItemNum} item(s).`);
                    }

                    qbo.refreshAccessToken((e, refreshresponse) => {
                        //console.log(refreshresponse);
                    });
                    if (importedItemNum === totalItemNum) {
                        console.log(`Imported All Items!`);
                        try {
                            FailedItemWriter.writeRecords(ErrorMessages).then(() => {
                                console.log(`FailedItem reported!`);
                            });
                        } catch (e) {
                            console.log(e);
                        }
                    }
                });
            } catch (e) {
                console.log(`Cannot create Item(s). Error message: ${e}`);
            }
        });
    });

    res.send(`Start importing items!`);
});

app.get('/allitems', (req, res) => {
    let SKUs = [];
    let SKUNum = 0;
    let AllItemsWriter = createCsvWriter({
        path: 'AllItems.csv',
        header: [
            {id: 'SKU', title: 'SKU'},
            {id: 'name', title: 'name'},
            {id: 'Id', title: 'Id'}
        ]
    });

    // Authorization
    fs.createReadStream('QBO-out.csv').pipe(csv()).on('data', (row) => {
        qbo = new QuickBooks(
            row.consumerKey,
            row.consumerSecret,
            row.token,
            false, /* no token secret for oAuth 2.0 */
            row.realmId,
            false, /* use a sandbox account */
            false, /* turn debugging on */
            4, /* minor version */
            '2.0', /* oauth version */
            row.refreshToken
        );

        qbo.refreshAccessToken((e, refreshResponse) => {
            if (e) {
                console.log(e);
            } else {
                qbo.findItems({
                    fetchAll: true
                }, (err, items) => {
                    if (err) {
                        console.log(JSON.stringify(err));
                    } else {
                        items.QueryResponse.Item.forEach((item) => {
                            SKUNum += 1;
                            SKUs.push({
                                SKU: item.Sku,
                                name: item.Name,
                                Id: item.Id
                            });
                            console.log(`The ${SKUNum} item is written!`);
                        });
                    }
                    if (SKUNum === items.QueryResponse.maxResults) {
                        console.log(`Exported All Items!`);
                        try {
                            AllItemsWriter.writeRecords(SKUs).then(() => {
                                console.log(`AllItemsCsv exported!`);
                            });
                        } catch (e) {
                            console.log(e);
                        }
                    }
                });
            }
        });
    });

    res.send(`Exporting All Items`);
});

app.get('/bill', function (req, res) {

    fs.createReadStream('QBO-out.csv').pipe(csv()).on('data', (row) => {
        qbo = new QuickBooks(
            row.consumerKey,
            row.consumerSecret,
            row.token,
            false, /* no token secret for oAuth 2.0 */
            row.realmId,
            false, /* use a sandbox account */
            true, /* turn debugging on */
            4, /* minor version */
            '2.0' /* oauth version */
        );


        // [
        //     {
        //         DueDate: "2019-02-08",
        //         Balance: 1400,
        //         domain: "QBO",
        //         sparse: false,
        //         Id: "143",
        //         SyncToken: "0",
        //         MetaData: {
        //             CreateTime: "2019-02-08T17:48:32-08:00",
        //             LastUpdatedTime: "2019-02-08T17:48:32-08:00"
        //         },
        //         DocNumber: "POI-10",
        //         TxnDate: "2019-02-08",
        //         DepartmentRef: {
        //             value: "2",
        //             name: "Primary Warehouse"
        //         },
        //         CurrencyRef: {
        //             value: "USD",
        //             name: "United States Dollar"
        //         },
        //         Line: [
        //             {
        //                 Id: "1",
        //                 LineNum: 1,
        //                 Amount: 1000,
        //                 DetailType: "ItemBasedExpenseLineDetail",
        //                 ItemBasedExpenseLineDetail: {
        //                     BillableStatus: "NotBillable",
        //                     ItemRef: {
        //                         value: "11",
        //                         name: "Hyaluronic Express Brush Mask"
        //                     },
        //                     UnitPrice: 50,
        //                     Qty: 20,
        //                     TaxCodeRef: {
        //                         value: "NON"
        //                     }
        //                 }
        //             },
        //             {
        //                 Id: "2",
        //                 LineNum: 2,
        //                 Amount: 400,
        //                 DetailType: "ItemBasedExpenseLineDetail",
        //                 ItemBasedExpenseLineDetail: {
        //                     BillableStatus: "NotBillable",
        //                     ItemRef: {
        //                         value: "10",
        //                         name: "Winter Iris Mousse Lip Color"
        //                     },
        //                     UnitPrice: 40,
        //                     Qty: 10,
        //                     TaxCodeRef: {
        //                         value: "NON"
        //                     }
        //                 }
        //             }
        //         ],
        //         VendorRef: {
        //             value: "1",
        //             name: "Test Vendor"
        //         },
        //         APAccountRef: {
        //             value: "36",
        //             name: "Accounts Payable (A/P)"
        //         },
        //         TotalAmt: 1400
        //     }
        // ]


        qbo.createBill({
            "DocNumber": "POI-11",
            "TxnDate": "2019-02-06",
            "DepartmentRef": {
                value: "2",
                name: "Primary Warehouse"
            },
            "Line": [
                {
                    Id: "1",
                    LineNum: 1,
                    Amount: 1000,
                    DetailType: "ItemBasedExpenseLineDetail",
                    ItemBasedExpenseLineDetail: {
                        BillableStatus: "NotBillable",
                        ItemRef: {
                            value: "11",
                            name: "Hyaluronic Express Brush Mask"
                        },
                        UnitPrice: 50,
                        Qty: 20,
                        TaxCodeRef: {
                            value: "NON"
                        }
                    }
                },
                {
                    Id: "2",
                    LineNum: 2,
                    Amount: 400,
                    DetailType: "ItemBasedExpenseLineDetail",
                    ItemBasedExpenseLineDetail: {
                        BillableStatus: "NotBillable",
                        ItemRef: {
                            value: "10",
                            name: "Winter Iris Mousse Lip Color"
                        },
                        UnitPrice: 40,
                        Qty: 10,
                        TaxCodeRef: {
                            value: "NON"
                        }
                    }
                }
            ],
            "VendorRef": {
                value: "1",
                name: "Test Vendor"
            },
            "APAccountRef": {
                value: "36",
                name: "Accounts Payable (A/P)"
            },
            "TotalAmt": 1400
        }, function (err, bill) {
            if (err) {
                res.send(`${JSON.stringify(err)}`);
            } else {
                res.send(`${JSON.stringify(bill)}`);
            }
        });
    });
});

app.get('/po', function (req, res) {

    fs.createReadStream('QBO-out.csv').pipe(csv()).on('data', (row) => {
        qbo = new QuickBooks(
            row.consumerKey,
            row.consumerSecret,
            row.token,
            false, /* no token secret for oAuth 2.0 */
            row.realmId,
            false, /* use a sandbox account */
            true, /* turn debugging on */
            4, /* minor version */
            '2.0' /* oauth version */
        );



        // qbo.findBills({
        //     "DocNumber": "POI-11"
        // }, (err, bill) => {
        //     if (err) {
        //         res.send(`${JSON.stringify(err)}`);
        //     } else {
        //         let BillId = bill.QueryResponse.Bill[0].Id;
        //         console.log(BillId);

        // Push to QBO: POI Verified -> Completed
        qbo.createPurchaseOrder({
            "DocNumber": "POI-10", // Receipt Id
            "TxnDate": "2019-02-06", // Verified -> Completed Date
            "DepartmentRef": {
                "value": "1",
                "name": "Primary Warehouse"  // Receiving Location
            },
            "Line": [
                {
                    "LineNum": 1,
                    "Amount": 60,  // Adj. Unit Cost * Processed Qty.
                    "DetailType": "ItemBasedExpenseLineDetail",
                    "ItemBasedExpenseLineDetail": {
                        "BillableStatus": "NotBillable",
                        "ItemRef": {
                            "value": "22280",
                            "name": "Abbigail Boyshort Hiphuggers (D1405230343-2XL)"
                        },
                        "UnitPrice": 60,  // Adj. Unit Cost
                        "Qty": 1,  // Processed Qty.
                        "TaxCodeRef": {
                            "value": "NON"
                        }
                    }
                },
                {
                    "LineNum": 2,
                    "Amount": 80,
                    "DetailType": "ItemBasedExpenseLineDetail",
                    "ItemBasedExpenseLineDetail": {
                        "BillableStatus": "NotBillable",
                        "ItemRef": {
                            "value": "18029",
                            "name": "Abbigail Boyshort Hiphuggers (D1405230343-L)"
                        },
                        "UnitPrice": 80,
                        "Qty": 1,
                        "TaxCodeRef": {
                            "value": "NON"
                        }
                    }
                }
            ],
            "VendorRef": {
                "value": "5",
                "name": "Vic Top"
            },
            "APAccountRef": {
                "value": "42",
                "name": "Accounts Payable (A/P)"
            },
        }, function (err, purchaseOrder) {
            if (err) {
                res.send(`${JSON.stringify(err)}`);
            } else {
                res.send(`${JSON.stringify(purchaseOrder)}`);
            }
        });
        //     }
        // });

        // qbo.createPurchaseOrder({
        //     "DocNumber": "POI-11",
        //     "TxnDate": "2019-02-06",
        //     "DepartmentRef": {
        //         value: "2",
        //         name: "Primary Warehouse"
        //     },
        //     "Line": [
        //         {
        //             Id: "1",
        //             LineNum: 1,
        //             Amount: 1000,
        //             DetailType: "ItemBasedExpenseLineDetail",
        //             ItemBasedExpenseLineDetail: {
        //                 BillableStatus: "NotBillable",
        //                 ItemRef: {
        //                     value: "11",
        //                     name: "Hyaluronic Express Brush Mask"
        //                 },
        //                 UnitPrice: 50,
        //                 Qty: 20,
        //                 TaxCodeRef: {
        //                     value: "NON"
        //                 }
        //             }
        //         },
        //         {
        //             Id: "2",
        //             LineNum: 2,
        //             Amount: 400,
        //             DetailType: "ItemBasedExpenseLineDetail",
        //             ItemBasedExpenseLineDetail: {
        //                 BillableStatus: "NotBillable",
        //                 ItemRef: {
        //                     value: "10",
        //                     name: "Winter Iris Mousse Lip Color"
        //                 },
        //                 UnitPrice: 40,
        //                 Qty: 10,
        //                 TaxCodeRef: {
        //                     value: "NON"
        //                 }
        //             }
        //         }
        //     ],
        //     "VendorRef": {
        //         value: "1",
        //         name: "Test Vendor"
        //     },
        //     "APAccountRef": {
        //         value: "36",
        //         name: "Accounts Payable (A/P)"
        //     },
        //     "TotalAmt": 1400
        // }, function (err, purchaseOrder) {
        //     if (err) {
        //         res.send(`${JSON.stringify(err)}`);
        //     } else {
        //         res.send(`${JSON.stringify(purchaseOrder)}`);
        //     }
        // });
    });
});

app.get('/invoice', (req, res) => {
    // qbo.findInvoices({
    //     fetchAll: true
    // }, (err, invoice) => {
    //     res.send(JSON.stringify(invoice));
    // });

    qbo.createInvoice({
        "DocNumber": "O2000013",
        "TxnDate": "2019-02-06",
        "DepartmentRef": {
            "value": "1",
            "name": "Primary Warehouse"
        },
        "Line": [
            {
                "LineNum": 1,
                "Amount": 10,
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "ItemRef": {
                        "value": "20940",
                        "name": "3-in-1 Matte Velveteen Tint - Holiday (H530496J8037-30)"
                    },
                    "UnitPrice": 10,  // Refund Price
                    "Qty": 1,
                    "ItemAccountRef": {
                        "value": "34",
                        "name": "Sales of Product Income"
                    },
                    "TaxCodeRef": {
                        "value": "Tax"
                    }
                }
            },
            {
                "LineNum": 2,
                "Amount": 50,
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "ItemRef": {
                        "value": "20940",
                        "name": "3-in-1 Matte Velveteen Tint - Holiday (H530496J8037-30)"
                    },
                    "UnitPrice": 50,
                    "Qty": 1,
                    "ItemAccountRef": {
                        "value": "34",
                        "name": "Sales of Product Income"
                    },
                    "TaxCodeRef": {
                        "value": "Tax"
                    }
                }
            },
            {
                "Amount": 60, //SubtotalAfterDiscount
                "DetailType": "SubTotalLineDetail",
                "SubTotalLineDetail": {}
            },
            {
                "Amount": 5,  // Shipping Fee
                "DetailType": "SalesItemLineDetail",
                "SalesItemLineDetail": {
                    "ItemRef": {
                        "value": "SHIPPING_ITEM_ID"
                    }
                }
            },

        ],
        "TxnTaxDetail": {
            "TotalTax": 80,
        },
        "CustomerRef": {
            "value": "1",
            "name": "Official Site Customer"
        },
        "SalesTermRef": {
            "value": "1"
        },
        "BillEmail": {
            "Address": "ck@evestemptation.com"
        }
    }, (err, invoice) => {
        if (err) {
            console.log(JSON.stringify(err));
        } else {
            res.send(JSON.stringify(invoice));
        }
    });
});

app.get('/payment', (req, res) => {
    // qbo.findPayments({
    //     fetchAll: true
    // },(err, payment)=>{
    //     if (err) {
    //         console.log(JSON.stringify(err));
    //     } else {
    //         res.send(JSON.stringify(payment));
    //     }
    // });

    fs.createReadStream('QBO-out.csv').pipe(csv()).on('data', (row) => {
        qbo = new QuickBooks(
            row.consumerKey,
            row.consumerSecret,
            row.token,
            false, /* no token secret for oAuth 2.0 */
            row.realmId,
            false, /* use a sandbox account */
            false, /* turn debugging on */
            4, /* minor version */
            '2.0', /* oauth version */
            row.refreshToken
        );

        qbo.refreshAccessToken((e, refreshResponse) => {
            if (e) {
                console.log(e);
            } else {
                qbo.createPayment({
                    "CustomerRef": {
                        "value": "1",
                        "name": "Official Site Customer"
                    },
                    "DepositToAccountRef": {
                        "value": "32"
                    },
                    "PaymentMethodRef": {
                        "value": "3"
                        // "PaymentMethod": [
                        //     {
                        //         "Name": "AliPay",
                        //         "Active": true,
                        //         "Type": "NON_CREDIT_CARD",
                        //         "domain": "QBO",
                        //         "sparse": false,
                        //         "Id": "7",
                        //         "SyncToken": "0",
                        //         "MetaData": {
                        //             "CreateTime": "2019-02-18T17:00:26-08:00",
                        //             "LastUpdatedTime": "2019-02-18T17:00:26-08:00"
                        //         }
                        //     },
                        //     {
                        //         "Name": "Braintree Credit Card",
                        //         "Active": true,
                        //         "Type": "CREDIT_CARD",
                        //         "domain": "QBO",
                        //         "sparse": false,
                        //         "Id": "3",
                        //         "SyncToken": "1",
                        //         "MetaData": {
                        //             "CreateTime": "2019-02-12T10:12:18-08:00",
                        //             "LastUpdatedTime": "2019-02-18T16:53:04-08:00"
                        //         }
                        //     },
                        //     {
                        //         "Name": "Braintree Paypal",
                        //         "Active": true,
                        //         "Type": "NON_CREDIT_CARD",
                        //         "domain": "QBO",
                        //         "sparse": false,
                        //         "Id": "5",
                        //         "SyncToken": "0",
                        //         "MetaData": {
                        //             "CreateTime": "2019-02-18T17:00:01-08:00",
                        //             "LastUpdatedTime": "2019-02-18T17:00:01-08:00"
                        //         }
                        //     },
                        //     {
                        //         "Name": "Cash",
                        //         "Active": true,
                        //         "Type": "NON_CREDIT_CARD",
                        //         "domain": "QBO",
                        //         "sparse": false,
                        //         "Id": "1",
                        //         "SyncToken": "0",
                        //         "MetaData": {
                        //             "CreateTime": "2019-02-12T10:12:18-08:00",
                        //             "LastUpdatedTime": "2019-02-12T10:12:18-08:00"
                        //         }
                        //     },
                        //     {
                        //         "Name": "Check",
                        //         "Active": true,
                        //         "Type": "NON_CREDIT_CARD",
                        //         "domain": "QBO",
                        //         "sparse": false,
                        //         "Id": "2",
                        //         "SyncToken": "0",
                        //         "MetaData": {
                        //             "CreateTime": "2019-02-12T10:12:18-08:00",
                        //             "LastUpdatedTime": "2019-02-12T10:12:18-08:00"
                        //         }
                        //     },
                        //     {
                        //         "Name": "Square",
                        //         "Active": true,
                        //         "Type": "NON_CREDIT_CARD",
                        //         "domain": "QBO",
                        //         "sparse": false,
                        //         "Id": "4",
                        //         "SyncToken": "0",
                        //         "MetaData": {
                        //             "CreateTime": "2019-02-18T16:59:13-08:00",
                        //             "LastUpdatedTime": "2019-02-18T16:59:13-08:00"
                        //         }
                        //     },
                        //     {
                        //         "Name": "WechatPay",
                        //         "Active": true,
                        //         "Type": "NON_CREDIT_CARD",
                        //         "domain": "QBO",
                        //         "sparse": false,
                        //         "Id": "6",
                        //         "SyncToken": "0",
                        //         "MetaData": {
                        //             "CreateTime": "2019-02-18T17:00:17-08:00",
                        //             "LastUpdatedTime": "2019-02-18T17:00:17-08:00"
                        //         }
                        //     }
                    },
                    "TotalAmt": 145,
                    "Line": [{
                        "Amount": 145,
                        "LinkedTxn": [
                            {
                                "TxnId": "30627",
                                "TxnType": "Invoice"
                            }]
                    }],
                    "TxnDate": "2019-02-11",
                }, (err, payment) => {
                    if (err) {
                        console.log(JSON.stringify(err));
                    } else {
                        res.send(JSON.stringify(payment));
                    }
                });
            }
        });
    });

});

app.get('/paymentmethod', (req, res) => {
    fs.createReadStream('QBO-out.csv').pipe(csv()).on('data', (row) => {
        qbo = new QuickBooks(
            row.consumerKey,
            row.consumerSecret,
            row.token,
            false, /* no token secret for oAuth 2.0 */
            row.realmId,
            false, /* use a sandbox account */
            false, /* turn debugging on */
            4, /* minor version */
            '2.0', /* oauth version */
            row.refreshToken
        );

        qbo.refreshAccessToken((e, refreshResponse) => {
            if (e) {
                console.log(e);
            } else {
                console.log(refreshResponse);
                qbo.findPaymentMethods({
                    "Name": "Credit Card"
                }, (err, paymentMethod) => {
                    if (err) {
                        console.log(JSON.stringify(err));
                    } else {
                        let PaymentMethodToUpdate = paymentMethod.QueryResponse.PaymentMethod[0];
                        PaymentMethodToUpdate.Name = "Braintree Credit Card";
                        qbo.updatePaymentMethod(PaymentMethodToUpdate, (err, paymentMethod) => {
                            if (err) {
                                console.log(err);
                            } else {
                                res.send(JSON.stringify(paymentMethod));
                            }
                        });
                    }
                });
            }
        });
    });


});

app.get('/refund', (req, res) => {
    // qbo.findPayments({
    //     fetchAll: true
    // },(err, payment)=>{
    //     if (err) {
    //         console.log(JSON.stringify(err));
    //     } else {
    //         res.send(JSON.stringify(payment));
    //     }
    // });

    fs.createReadStream('QBO-out.csv').pipe(csv()).on('data', (row) => {
        qbo = new QuickBooks(
            row.consumerKey,
            row.consumerSecret,
            row.token,
            false, /* no token secret for oAuth 2.0 */
            row.realmId,
            false, /* use a sandbox account */
            false, /* turn debugging on */
            4, /* minor version */
            '2.0', /* oauth version */
            row.refreshToken
        );

        qbo.refreshAccessToken((e, refreshResponse) => {
            if (e) {
                console.log(e);
            } else {
                qbo.createRefundReceipt({
                    "DocNumber": "O2000012",
                    "TxnDate": "2019-02-11",
                    "DepartmentRef": {
                        "value": "1",
                        "name": "Primary Warehouse"
                    },
                    "Line": [
                        {
                            "LineNum": 1,
                            "Amount": 10,
                            "DetailType": "SalesItemLineDetail",
                            "SalesItemLineDetail": {
                                "ItemRef": {
                                    "value": "20940",
                                    "name": "3-in-1 Matte Velveteen Tint - Holiday (H530496J8037-30)"
                                },
                                "UnitPrice": 10,
                                "Qty": 1,
                                "ItemAccountRef": {
                                    "value": "34",
                                    "name": "Sales of Product Income"
                                },
                                "TaxCodeRef": {
                                    "value": "TAX"
                                }
                            }
                        },
                        {
                            "LineNum": 2,
                            "Amount": 50,
                            "DetailType": "SalesItemLineDetail",
                            "SalesItemLineDetail": {
                                "ItemRef": {
                                    "value": "20940",
                                    "name": "3-in-1 Matte Velveteen Tint - Holiday (H530496J8037-30)"
                                },
                                "UnitPrice": 50,
                                "Qty": 1,
                                "ItemAccountRef": {
                                    "value": "34",
                                    "name": "Sales of Product Income"
                                },
                                "TaxCodeRef": {
                                    "value": "TAX"
                                }
                            }
                        },
                        {
                            "Amount": 60,
                            "DetailType": "SubTotalLineDetail",
                            "SubTotalLineDetail": {}
                        },
                        {
                            "Amount": 5,
                            "DetailType": "SalesItemLineDetail",
                            "SalesItemLineDetail": {
                                "ItemRef": {
                                    "value": "SHIPPING_ITEM_ID"
                                }
                            }
                        }
                    ],
                    "TxnTaxDetail": {
                        "TotalTax": 80
                    },
                    "CustomerRef": {
                        "value": "1",
                        "name": "Official Site Customer"
                    },
                    "PaymentMethodRef": {
                        "value": "3",
                        "name": "Braintree Credit Card"
                    },
                    "DepositToAccountRef": {
                        "value": "32",
                        "name": "1000 JEM BOA Checking"
                    },
                    "BillEmail": {
                        "Address": "CK@evestemptation.com"
                    }
                }, (err, refund) => {
                    if (err) {
                        console.log(JSON.stringify(err));
                    } else {
                        res.send(JSON.stringify(refund));
                    }
                });
            }
        });
    });
});