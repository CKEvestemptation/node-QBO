const csv = require('csv-parser');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
// const csvWriter = createCsvWriter({
//     path: 'QBO-out.csv',
//     header: [
//         {id: 'consumerKey', title: 'consumerKey'},
//         {id: 'consumerSecret', title: 'consumerSecret'},
//         {id: 'token', title: 'token'},
//         {id: 'tokenSecret', title: 'tokenSecret'},
//         {id: 'realmId', title: 'realmId'},
//         {id: 'useSandbox', title: 'useSandbox'},
//         {id: 'debug', title: 'debug'},
//         {id: 'endpoint', title: 'endpoint'},
//         {id: 'minorversion', title: 'minorversion'},
//         {id: 'oauthversion', title: 'oauthversion'},
//         {id: 'refreshToken', title: 'refreshToken'},
//     ]
// });
//
//
// // fs.createReadStream('data.csv').pipe(csv()).on('data', (row) => {
// //     if (!row) {
// //         console.log(`CSV file successfully processed!`);
// //     } else {
// //         console.log(row);
// //     }
// // });
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
// }];
//
// try {
//     csvWriter.writeRecords(qbo).then(() => console.log('The QBO-out file was written successfully'));
// } catch (e) {
//     console.log(e);
// }


let FailedItemWriter = createCsvWriter({
    path: 'FailedItem.csv',
    header:[{id: 'message', title: 'message'}]
});

let ErrorMessage = [];

ErrorMessage.push({
    message:'12312321'
});

ErrorMessage.push({
    message:'4444444'
});


FailedItemWriter.writeRecords(ErrorMessage).then(()=>{console.log(`FailedItem exported!`)});