const moment = require('moment');
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const app = express();
const PORT = 8080;
const useragent = require('useragent');	//za broj posjeta sa Chrome i Firefox
const ip = require('ip');	//za ip adresu
const db = require('./db'); //da bi mogli pristupiti modelima i podacima u njima
const { QueryTypes } = require('sequelize'); 	//za raw queri-e


let stanja = [];			//niz nizova, na indexu 'i' su stanja 'i' 
							// stanja [] se koristi kako se ne bi svaki put dohvaćale slike sa ajaxom, već se učitaju i tako dohvaćaju 
let disableKraj = [];
let prethodnoStanje = 0;	//prethodne slike
let trenutnoStanje = 0;		//trenutne slike
const imgFolder = './frontend/img/'		//za dohvaćanje slika iz foldera img


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('frontend'));

//const { Op } = require("sequelize");
function daLiJeTerminRezervisan(periodicni, rezervacija, pocetak, kraj, sala, datumR = null, danR = 0, semestarR = null) {
	if (periodicni == 0) { //vanredni
		for (let i = 0; i < rezervacija.length; i++) {
			if (
				rezervacija[i].datum == datumR &&
				rezervacija[i].naziv == sala &&
				rezervacija[i].pocetak == pocetak &&
				rezervacija[i].kraj === kraj
			) {
				return true;
			}
		}
	}
	else {	//periodicni
		for (let i = 0; i < rezervacija.length; i++) {
			if (
				rezervacija[i].semestar === semestarR &&
				rezervacija[i].naziv === sala &&
				rezervacija[i].pocetak === pocetak &&
				rezervacija[i].kraj === kraj &&
				rezervacija[i].dan === danR
			) {
				return true;
			}
		}
	}	
	return false;
}

//Rute
app.get('/', function(req, res) {	
	res.sendFile('./frontend/pocetna.html', { root: __dirname});
});

app.get('/rezervacije', async function(req, res) {
	const podaci = await db.conn.query("SELECT sala.naziv, termin.dan, termin.datum, termin.semestar, termin.pocetak, termin.kraj, osoblje.ime, osoblje.prezime FROM `rezervacija`, `sala`, `termin`, `osoblje` WHERE rezervacija.sala = sala.id AND rezervacija.osoba = osoblje.id AND rezervacija.termin = termin.id", { type: QueryTypes.SELECT });
	let rezervacija = req.body;
	var sveRezervacije = [];

	for (var i = 0; i < podaci.length; i++) {
		podaci[i].pocetak = podaci[i].pocetak.substring(0, 5); //Ukoliko se koristi MySql 
		podaci[i].kraj = podaci[i].kraj.substring(0, 5);	//Ukoliko se koristi MySql 
		sveRezervacije.push(podaci[i]);
	}
	res.send(sveRezervacije);
});

app.get('/fotografije', function(req, res) {
	var count = 0;
	var path = './img/';
	var slike = [];

	fs.readdir(imgFolder, (err, files) => {
	  files.forEach(image => {
	  	if(count < 3) {
	      slike.push(path + image);
	      count++;
	 	 }
	  });
	});
	
	 setTimeout(() => {		//pošto je u pitanju asihrona stranica, potrebno je sačekati da se slike učitaju
	 	stanja[trenutnoStanje] = slike;
     	res.json(slike);
    }, 500);
});


app.get('/fotografijeNext', function(req, res) {	//sljedeće fotografije, ovo se poziva kada se dohvaćaju iz već učitanih slika naredne 
	var path = './img/';
	trenutnoStanje++;	//trenutno stanje, tj. trenutne 3 slike, po banerima, prve 3 - trenutno stanje: 1 itd..

	var slike = [];				
	var endOfGallery = '';	//označava kraj galerije, ukoliko nema više slika onda se endOfGallery postavlja na 'end'

	if(stanja[trenutnoStanje] != undefined) {
		slike = stanja[trenutnoStanje];
		endOfGallery = disableKraj[trenutnoStanje];
	}
	else {
		fs.readdir(imgFolder, (err, files) => {	//čitanje slika iz foldera sa slikama
				var count = 0;
				for(var i = (trenutnoStanje) * 3; count < 3;i++, count++) { 
					if(files[i] != undefined) {
						slike.push(path + files[i]);
					}
					else {
						endOfGallery = 'end'; 

					}
				}
				if(files[(trenutnoStanje) * 3 + count] == undefined) { //ako nestane slka - za slučaj kada je broj slika djeljiv sa 3, pa je posljednji baner sa 3 slike
					endOfGallery = 'end';
				}
			});
	}
	
	 setTimeout(() => {
	 	prethodnoStanje = trenutnoStanje;
	 	stanja[trenutnoStanje] = slike;
	 	disableKraj[trenutnoStanje] = endOfGallery;
	 	var jsonData = {
	 		images: slike,
	 		state: endOfGallery
	 	}
     	res.json(jsonData);
    }, 500);
});
//kako rade prethodne i sljedeće se može vidjeti kada se uđe na inspect->Network na stranici i ide naprijed i nazad, već učitane slike se dohvaćaju iz ovih poziva 
app.get('/fotografijePrev', function(req, res) { //prethodne fotografije, ovo se poziva kada se dohvaćaju iz već učitanih slika naredne
	var count = 0;
	var path = './img/';
	trenutnoStanje--;

	var slike = [];	

	if(stanja[trenutnoStanje] != undefined) {
		slike = stanja[trenutnoStanje];
	}
	else {
		fs.readdir(imgFolder, (err, files) => {
			var count = 0;
			for(var i = (trenutnoStanje) * 3; count < 3;i++, count++) {
				slike.push(path + files[i]);
			}
		});
	}
	
	 setTimeout(() => {
	 	disableKraj[trenutnoStanje] = trenutnoStanje;
	 	prethodnoStanje = trenutnoStanje;
	 	stanja[trenutnoStanje] = slike;
     	var jsonData = {
	 		images: slike,
	 		state: trenutnoStanje
	 	}
     	res.json(jsonData);
    }, 500);
});

app.post('/rezervacije', async function(req, res) {

// Dohvaćanje svih rezervacija u jednoj tabeli:
//	SELECT sala.naziv, termin.dan, termin.datum, termin.semestar, termin.pocetak, 
//			termin.kraj, osoblje.ime, osoblje.prezime 
//	FROM 'rezervacija', 'sala', 'termin', 'osoblje' 
//	WHERE rezervacija.sala = sala.id AND rezervacija.osoba = osoblje.id AND rezervacija.termin = termin.id

	const podaci = await db.conn.query("SELECT sala.naziv, termin.dan, termin.datum, termin.semestar, termin.pocetak, termin.kraj, osoblje.ime, osoblje.prezime FROM `rezervacija`, `sala`, `termin`, `osoblje` WHERE rezervacija.sala = sala.id AND rezervacija.osoba = osoblje.id AND rezervacija.termin = termin.id", { type: QueryTypes.SELECT });
	let rezervacija = req.body;
	var sveRezervacije = [];

	for (var i = 0; i < podaci.length; i++) {
		sveRezervacije.push(podaci[i]);
	}
	if (rezervacija.hasOwnProperty('dan')) {
		if (
			daLiJeTerminRezervisan(
				1, //Periodični podaci
				sveRezervacije,
				rezervacija['pocetak'],
				rezervacija['kraj'],
				rezervacija['naziv'],
				null,	//nema datuma u periodicnim podacima pa je null
				rezervacija['dan'],
				rezervacija['semestar'],
			)
		) {
			res.send({ 
				error: 1
			 });
		} else {

			//ubacivanje termina
			var t_id;
			await db.termin.create({
				redovni: true,
				dan: rezervacija.dan,
				datum: null,
				semestar: rezervacija.semestar,
				pocetak: rezervacija.pocetak,
				kraj: rezervacija.kraj
			})
			.then(function(termin) { //termin je upravo kreirani objekat
				t_id = termin.id;
			});


			//ubacivanje osobe - znamo da su osobe fixne jer ih nigdje ne dodajemo, 
			//postoje samo 3 koje biraju i znamo da su različite pa možemo koristiti findOne
			var o_id; 
			await db.osoblje.findOne({
				where: {
					ime: rezervacija.predavac.split(' ')[0],
					prezime: rezervacija.predavac.split(' ')[1]
				}
			})
			.then(function(osoba) { //osoba je upravo kreirani objekat
				o_id = osoba.id;
			});


			//ubacivanje sale
			//sala - osoblje je veza 1 na 1 zato ide findOrCreate(radi update), jer jednu salu može zadužiti samo jedna osoba, inače bi bilo find
			var s_id;
			await db.sala.findOrCreate({
				where: {
					naziv: rezervacija.naziv,
					zaduzenaOsoba: o_id
				}
			})
			.then(function(sala) {
				s_id = sala[0].id;
			});


			//ubacivanje rezervacije
			await db.rezervacija.create({
				termin: t_id,
				sala: s_id,
				osoba: o_id
			})
			.then(function() {
				console.log("Ubaceno u bazu");
			});

			sveRezervacije.push(rezervacija);			
		}
		
	} else {
		if (
			daLiJeTerminRezervisan(
				0,	//Vanredni podaci
				sveRezervacije,
				rezervacija['pocetak'],
				rezervacija['kraj'],
				rezervacija['naziv'],
				rezervacija['datum'],
				0,	//nema dana u vanrednim podacima pa je 0
				null,	//nema semestra u vanrednim podacima pa je null
			)
		) {
           res.send({ 
				error: 1
			 });
		} else {
			//ubacivanje termina
			var t_id;
			await db.termin.create({
				redovni: true,
				dan: null,
				datum: rezervacija.datum,
				semestar: null,
				pocetak: rezervacija.pocetak,
				kraj: rezervacija.kraj
			})
			.then(function(termin) { //termin je upravo kreirani objekat
				t_id = termin.id;
			});


			//ubacivanje osobe - znamo da su osobe fixne jer ih nigdje ne dodajemo, 
			//postoje samo 3 koje biraju i znamo da su različite pa možemo koristiti findOne
			var o_id; 
			await db.osoblje.findOne({
				where: {
					ime: rezervacija.predavac.split(' ')[0],
					prezime: rezervacija.predavac.split(' ')[1]
				}
			})
			.then(function(osoba) { //osoba je upravo kreirani objekat
				o_id = osoba.id;
			});


			//ubacivanje sale
			//sala - osoblje je veza 1 na 1 zato ide findOrCreate(radi update), jer jednu salu može zadužiti samo jedna osoba, inače bi bilo find
			var s_id;
			await db.sala.findOrCreate({
				where: {
					naziv: rezervacija.naziv,
					zaduzenaOsoba: o_id
				}
			})
			.then(function(sala) {
				s_id = sala[0].id;
			});


			//ubacivanje rezervacije
			await db.rezervacija.create({
					termin: t_id,
					sala: s_id,
					osoba: o_id
			})
			.then(function() {
				console.log("Ubaceno u bazu");
			});

			sveRezervacije.push(rezervacija);		
		}
	}
	res.send(sveRezervacije);
});

app.get("/posjete", function(req, res) {
	var userIPAddress = ip.address(); 			//dohvaća IP adresu
	let posjeteJson = fs.readFileSync('./posjete.json');
	let posjete = JSON.parse(posjeteJson);		//uzima podatke iz json file-a kako bi ih mijenjao
	var agent = useragent.parse(req.headers['user-agent']);		//dohvaća browser
	if(agent.family == 'Chrome') {		
		posjete.chrome++; 
	}
	else if(agent.family == 'Firefox') {
		posjete.firefox++; 
	}
	if(!posjete.ip_adrese.includes(userIPAddress)) {		//ukoliko je ip adresa nova
		posjete.ip_adrese.push(userIPAddress);
		posjete.broj_razlicitih_ip_adresa = posjete.broj_razlicitih_ip_adresa + 1;
	}

	fs.writeFileSync("./posjete.json", JSON.stringify(posjete));
	res.send(posjete);
});


app.get('/osoblje', async (req, res) => {
    await db.osoblje.findAll().then((result) => {
		res.send(JSON.stringify(result));
    });
});

app.get('/osobljeisale', async function(req, res) {
	
	const osobljeisale = await db.conn.query("SELECT osoblje.ime, osoblje.prezime, sala.naziv, termin.dan, termin.datum, termin.semestar, termin.pocetak, termin.kraj FROM `rezervacija`, `sala`, `termin`, `osoblje` WHERE rezervacija.osoba = osoblje.id AND termin.id = rezervacija.termin AND rezervacija.sala = sala.id ;", { type: QueryTypes.SELECT });
	const osobljebezsale = await db.conn.query("SELECT osoblje.ime, osoblje.prezime FROM `osoblje` WHERE osoblje.id NOT IN (SELECT rezervacija.osoba FROM `rezervacija`) AND osoblje.id NOT IN(SELECT osoblje.id FROM `rezervacija`, `sala`, `termin`, `osoblje` WHERE rezervacija.osoba = osoblje.id AND termin.id = rezervacija.termin AND rezervacija.sala = sala.id)", { type: QueryTypes.SELECT });
	var sveRezervacije = [];
	if(osobljeisale.length != 0){
		for (var i = 0; i < osobljeisale.length; i++) {
			sveRezervacije.push(osobljeisale[i]);
		}
	}
	if(osobljebezsale.length != 0){
		for (var i = 0; i < osobljebezsale.length; i++) {
			sveRezervacije.push(osobljebezsale[i]);
		}
	}
	res.send(sveRezervacije);

});


app.listen(PORT, () => {
	console.log('Stranica je na http://localhost:' + PORT + '/ portu!');
});