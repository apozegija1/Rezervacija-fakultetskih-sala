const Sequelize = require("sequelize");

module.exports = function(sequelize,DataTypes){
    const Rezervacija = sequelize.define("rezervacija",{
        termin: {
            type: Sequelize.INTEGER,
            unique: true
        },
        sala:Sequelize.INTEGER,
        osoba: Sequelize.INTEGER
    }, {
        timestamps: false,
        freezeTableName: true
    });
    return Rezervacija;
};