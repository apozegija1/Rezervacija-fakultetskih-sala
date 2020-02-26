const Sequelize = require("sequelize");

module.exports = function(sequelize,DataTypes){
    const Termin = sequelize.define("termin",{
        redovni: Sequelize.BOOLEAN,
        dan: Sequelize.INTEGER,
        datum: Sequelize.STRING,
        semestar: Sequelize.STRING,
        pocetak: Sequelize.TIME,
        kraj: Sequelize.TIME
    }, {
        timestamps: false,
        freezeTableName: true
    });
    return Termin;
};