const Discord = require('discord.js');
const { DateTime } = require("luxon");
const mongo = require('../mongo.js');
const settings = require('../settings');
const userSettings = require('./userSettings');

module.exports = {
    name: 'upcoming',
    description: 'List deadlines and events within the next week.',
    aliases: ['todo'],
    usage: '[days = 7] [view type]',
    args: false,
    guildOnly: false,
    displayHelp: true,
    async execute(message, args) {
        const argArray = (args) ? args.split(' ') : [];
        const daysToView = (argArray[0]) ? argArray[0] : (await userSettings.get(message.author.id)).todoDefaultDays;
        const viewType = (argArray[1]) ? argArray[1].toLowerCase() : "incomplete"

        if (isNaN(parseFloat(daysToView))) {
            message.channel.send(new Discord.MessageEmbed().setColor('#FF0000').setTitle('Error').setDescription('You did not provide a valid number of days to display.').setFooter('https://github.com/sunny-zuo/sir-goose-bot'));
            return;
        } else if (daysToView > 365) {
            message.channel.send(new Discord.MessageEmbed().setColor('#FF0000').setTitle('Error').setDescription('You can display a maximum of 365 days into the future. The Discord embed size limit will likely be reached earlier.').setFooter('https://github.com/sunny-zuo/sir-goose-bot'));
            return;
        }
        await this.sendEmbed(message, viewType);
    },
    async sendEmbed(message, viewType = "incomplete") {
        let pageSize = 7;
        let currentPage = 0;
        let taskCount = 0;
        if (viewType === "incomplete") { taskCount = await mongo.getDB().collection("tasks").countDocuments({ endTime: { $gte: new Date() }, completed: { $not: { $eq: message.author.id } } }) }
        else if (viewType === "complete") { taskCount = await mongo.getDB().collection("tasks").countDocuments({ endTime: { $gte: new Date() }, completed: message.author.id }) }
        else { taskCount = await mongo.getDB().collection("tasks").countDocuments({ endTime: { $gte: new Date() }}) };

        const filter = (reaction, user) => {
            return ['⬅️', '➡️'].includes(reaction.emoji.name) && user.id === message.author.id;
        };

        message.channel.send((await this.generateEmbed(message, viewType, pageSize, 0))).then(embedMessage => {
            if (taskCount > pageSize) {
                embedMessage.react('➡️');
            }
            const collector = embedMessage.createReactionCollector(filter, { time: 60000 });

            collector.on('collect', reaction => {
                embedMessage.reactions.removeAll().then(async () => {
                    reaction.emoji.name === '➡️' ? currentPage += 1 : currentPage -= 1;

                    embedMessage.edit((await this.generateEmbed(message, viewType, pageSize, currentPage)));

                    if (currentPage !== 0) {
                        await embedMessage.react('⬅️');
                    }
                    if ((currentPage + 1) * pageSize < taskCount) {
                        await embedMessage.react('➡️');
                    }
                })
            })
        })
    },
    async generateEmbed(message, viewType = "incomplete", pageSize, currentPage) {
        const fromDate = DateTime.local().setZone('America/Toronto');
        const midnightFrom = DateTime.local().setZone('America/Toronto').set({ hour: 0, minute: 0, second: 0, millisecond: 0 });

        let events;
        let viewDescr;

        if (viewType === "all" || viewType === "everything") {
            events = await mongo.getDB().collection("tasks").find({ endTime: { $gte: fromDate.toJSDate() } }).sort({ endTime: 1 }).limit(pageSize).skip(currentPage * pageSize).toArray();
            viewDescr = "All Tasks";
        } else if (viewType === "incomplete") {
            events = await mongo.getDB().collection("tasks").find({ endTime: { $gte: fromDate.toJSDate() }, completed: { $not: { $eq: message.author.id } } }).sort({ endTime: 1 }).limit(pageSize).skip(currentPage * pageSize).toArray();
            viewDescr = `${message.author.username}'s Incomplete Tasks`;
        } else if (viewType === "complete" || viewType === "completed") {
            events = await mongo.getDB().collection("tasks").find({ endTime: { $gte: fromDate.toJSDate() }, completed: message.author.id }).sort({ endTime: 1 }).limit(pageSize).skip(currentPage * pageSize).toArray();
            viewDescr = `${message.author.username}'s Completed Tasks`;
        } else {
            return new Discord.MessageEmbed().setColor('#FF0000').setTitle('Error').setDescription('You did not provide a valid display type. Valid options: `all`, `incomplete`, `complete`').setFooter('https://github.com/sunny-zuo/sir-goose-bot');
        }

        const outputEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(`Upcoming Dates for SE 25 - ${viewDescr} (Page ${currentPage + 1})`)
            .setDescription(`Here are all upcoming quizzes, due dates, and other important dates. Please contact <@${process.env.ADMIN_ID}> if there are any issues!\n${settings.get('global').upcomingMessage}`)
            .setFooter('https://github.com/sunny-zuo/sir-goose-bot');


        for (currentEvent of events) {
            const startDt = DateTime.fromJSDate(currentEvent.startTime, { zone: 'America/Toronto' });
            const endDt = DateTime.fromJSDate(currentEvent.endTime, { zone: 'America/Toronto' });

            let startDateFormat;
            let endDateFormat;

            if (currentEvent.ignoreTime) {
                startDateFormat = `${startDt.toLocaleString({ month: 'long', day: 'numeric', weekday: 'long' })}`;
                endDateFormat = `${endDt.toLocaleString({ month: 'long', day: 'numeric', weekday: 'long' })}`;
            } else {
                startDateFormat = `${startDt.toLocaleString({ month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', weekday: 'long' })}`;
                endDateFormat = `${endDt.toLocaleString({ month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', weekday: 'long' })}`;
            }

            // Add relative times (in 1 day, in 5 hours, etc)
            endDateFormat += (fromDate.until(endDt).length('days') < 1) ? ` (${endDt.toRelative()})` : ` (${endDt.toRelative(midnightFrom)})`
            startDateFormat += (fromDate.until(startDt).length('days') < 1) ? ` (${startDt.toRelative()})` : ` (${startDt.toRelative(midnightFrom)})`

            if (startDt.equals(endDt)) {
                outputEmbed.addField(`${currentEvent.type}: ${currentEvent.name} for ${currentEvent.class} (#${currentEvent.seqId})`, endDateFormat)
            } else {
                outputEmbed.addField(`${currentEvent.type}: ${currentEvent.name} for ${currentEvent.class} (#${currentEvent.seqId})`, `Starts ${startDateFormat}\nDue ${endDateFormat}`)
            }

        }

        return outputEmbed;
    }
}

