import {
    ApplicationCommandOption,
    Collection,
    CommandInteraction,
    CommandInteractionOption,
    Message,
    MessageEmbed,
    Permissions,
} from 'discord.js';
import Client from '../../Client';
import { Command } from '../Command';
import Guild from '../../models/guild.model';

const options: ApplicationCommandOption[] = [
    {
        name: 'prefix',
        description: 'The new prefix that the bot will respond to',
        type: 'STRING',
        required: false,
    },
];

export class Prefix extends Command {
    constructor(client: Client) {
        super(client, {
            name: 'prefix',
            description: 'View or set the prefix the bot will respond to for message commands',
            options: options,
            guildOnly: true,
            examples: '$',
            userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
        });
    }

    async execute(interaction: Message | CommandInteraction, args?: Collection<string, CommandInteractionOption>) {
        const newPrefix = args?.get('prefix')?.value as string;

        if (newPrefix) {
            await Guild.findOneAndUpdate(
                { guildId: interaction.guild!.id },
                {
                    $set: {
                        guildId: interaction.guild!.id,
                        prefix: newPrefix,
                    },
                },
                { upsert: true }
            );

            const embed = new MessageEmbed()
                .setColor('GREEN')
                .setTitle('Prefix Updated')
                .setDescription(`The prefix has been set to \`${newPrefix}\``)
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        } else {
            const guild = await Guild.findOne({ guildId: interaction.guild!.id });
            const embed = new MessageEmbed()
                .setColor('BLUE')
                .setTitle('Bot Prefix')
                .setDescription(`The current prefix is \`${guild?.prefix || '$'}\`. You can also use Discord slash commands!`)
                .setTimestamp();

            interaction.reply({ embeds: [embed] });
        }
    }
}
