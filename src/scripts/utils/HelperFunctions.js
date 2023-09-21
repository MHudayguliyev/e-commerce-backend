const ForPostgresIN = async (arr) => {
    let result = "";
    let llength = false;
    let lslice = "";
    if (arr?.length > 0) {
        arr.split(",").forEach((wn) => {
            result += "'" + wn + "'" + ",";
        });
        let lastResult = result.split(",").toString();
        llength = lastResult.length > 3;
        lslice = lastResult.slice(0, -1);
        return { llength, lslice };
    }

    return { llength, lslice };

};


function validatePhoneNumber(phoneNumber) {
    const regex = /^\d{11}$/;
    return regex.test(phoneNumber);
}

function validateEmailAddress(emailAddress) {
    const regex = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/;
    return regex.test(emailAddress);
}



function numberToOrder(number) {
    var orders = ["Birinji", "Ikinji", "Üçünji", "Dördünji", "Bäşinji", 'Altynjy', 'Ýedinji', 'Sekizinji', 'Dokuzynjy', 'Onunjy', 'On birinji', 'On ikinji', 'On üçünji', 'On dördünji', 'On bäşinji', 'On altynjy', 'On ýedinji']; // Sıralamaları içeren bir dizi oluşturduk
    var index = number - 1; // Gelen sayıyı dizi indeksi için uygun hale getirdik
    if (index >= 0 && index < orders.length) { // Dizi sınırları kontrol edildi
        return orders[index]; // İstenilen sıralamayı döndürdük
    } else {
        return "Geçersiz sayı"; // Dizi sınırları dışında bir sayı girilirse hata mesajı döndürdük
    }
}


function ContactTypeIDs(key) {
    switch (key) {
        case 'phone':
            return 2
        case 'email':
            return 3
        case 'home_phone':
            return 4
        case 'district':
            return 7
        case 'address':
            return 1
        case 'website':
            return 5
        case 'fax':
            return 6
        case 'skype':
            return 8
        default:
            return 9
    }
}

module.exports = {
    ForPostgresIN,
    validatePhoneNumber,
    validateEmailAddress,
    numberToOrder,
    ContactTypeIDs
};
