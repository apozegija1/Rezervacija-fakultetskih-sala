const Sequelize = require("sequelize");
const conn = new Sequelize("DBWT19","root","root",{ dialect:"sqlite", storage: 'DBWT19.sqlite', logging:false });
const db = {};

db.Sequelize = Sequelize;  
db.conn = conn;

//import modela
db.osoblje = conn.import(__dirname+'/osoblje.js');
db.termin = conn.import(__dirname+'/termin.js');
db.sala = conn.import(__dirname+'/sala.js');
db.rezervacija = conn.import(__dirname+'/rezervacija.js');

//relacije
// Osoblje - jedan na više - Rezervacija
db.osoblje.hasMany(db.rezervacija,{ foreignKey: 'osoba' });

// Rezervacija - jedan na jedan - Termin
db.termin.hasOne(db.rezervacija, { foreignKey: 'termin' });

// Rezervacija - više na jedan - Sala
db.sala.hasMany(db.rezervacija, { foreignKey: 'sala' });

// Sala - jedan na jedan - Osoblje
db.osoblje.hasOne(db.sala, { foreignKey: 'zaduzenaOsoba' });

db.conn
    .sync({
        force: true
    })
    .then(function(){
        /* 
            Redom se kreiraju tabele: osoblje, sala, termin, rezervacija
            Zbog toga što želimo baš ovakav redosljed kreiranja i umetanja podataka u tabele, ubacivali smo podatke u then dijelovima koda
        */

        //umeetanje redova u osoblje
        db.osoblje.bulkCreate([ //umetanje više redova odjednom
            {
                ime: 'Neko',
                prezime: 'Nekić',
                uloga: 'profesor'
            },
            {
                ime: 'Drugi',
                prezime: 'Neko',
                uloga: 'asistent'
            },
            {
                ime: 'Test',
                prezime: 'Test',
                uloga: 'asistent'
            }
        ]).then(function(){
            //console.log("Kreirano osoblje");
                
            //ubacivanje podataka u tabelu sala
                db.sala.bulkCreate([ //umetanje više redova odjednom
                    {
                        naziv: '1-11',
                        zaduzenaOsoba: '1'
                    },
                    {
                        naziv: '1-15',
                        zaduzenaOsoba: '2'
                    }
                ]).then(function(){
                    //console.log("Kreirane sale");
                    
                    //ubacivanje podata u tabelu termin
                    db.termin.bulkCreate([ //umetanje više redova odjednom
                        {
                            redovni: false,
                            dan: null,
                            datum: '01.01.2020',
                            semestar: null,
                            pocetak: '12:00',
                            kraj: '13:00'
                        },
                        {
                            redovni: true,
                            dan: 0,
                            datum: null,
                            semestar: 'zimski',
                            pocetak: '13:00',
                            kraj: '14:00'
                        }
                    ]).then(function(){
                        //console.log("Kreiran termin");

                        //ubacivanje podataka u tabelu rezervacija
                        db.rezervacija.bulkCreate([ //umetanje više redova odjednom
                            {
                                termin: 1,
                                sala: 1,
                                osoba: 1
                            },
                            {
                                termin: 2,
                                sala: 1,
                                osoba: 3
                            }
                        ]).then(function(){
                            //console.log("Kreirana rezervacija");
                            console.log("Gotovo kreiranje tabela i ubacivanje pocetnih podataka!");
                        });
                    });
                });
        });
    });
        
    


module.exports = db;