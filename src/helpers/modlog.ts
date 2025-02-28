import { ColorResolvable, Guild, MessageEmbed, Permissions, TextChannel, User, MessageOptions, Message } from 'discord.js';
import Client from '../Client';
import { GuildConfigCache } from './guildConfigCache';

export class Modlog {
    static async logUserAction(
        client: Client,
        guild: Guild | null,
        user: User,
        message: string,
        color: ColorResolvable = 'BLUE'
    ): Promise<Message | void> {
        if (!guild || !guild.me) return;

        const channel = await this.fetchModlogChannel(guild);

        if (channel && channel.permissionsFor(guild.me).has([Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.EMBED_LINKS])) {
            const embed = this.getUserEmbed(user, message, color);
            const sentMessage = await channel.send({ embeds: [embed] }).catch((e) => client.log.error(e, e.stack));
            return sentMessage;
        }
    }

    static async logInfoMessage(
        client: Client,
        guild: Guild | null,
        title: string,
        message: string,
        color: ColorResolvable = 'BLUE'
    ): Promise<Message | void> {
        if (!guild || !guild.me) return;

        const channel = await this.fetchModlogChannel(guild);

        if (channel && channel.permissionsFor(guild.me).has([Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.EMBED_LINKS])) {
            const embed = new MessageEmbed().setTitle(title).setColor(color).setDescription(message).setTimestamp();
            const sentMessage = await channel.send({ embeds: [embed] }).catch((e) => client.log.error(e, e.stack));
            return sentMessage;
        }
    }

    static async logMessage(client: Client, guild: Guild | null, message: MessageOptions): Promise<Message | void> {
        if (!guild || !guild.me) return;

        const channel = await this.fetchModlogChannel(guild);

        if (channel) {
            const sentMessage = await channel.send(message).catch((e) => client.log.error(e, e.stack));
            return sentMessage;
        }
    }

    static getUserEmbed(user: User, message: string, color: ColorResolvable = 'BLUE'): MessageEmbed {
        const embed = new MessageEmbed()
            .setAuthor(`${user.tag}`, user.displayAvatarURL())
            .setColor(color)
            .setDescription(message)
            .setFooter(`ID: ${user.id}`)
            .setTimestamp();

        return embed;
    }

    static async fetchModlogChannel(guild: Guild): Promise<TextChannel | null> {
        const config = await GuildConfigCache.fetchConfig(guild.id);
        if (config.enableModlog && config.modlogChannelId) {
            const channel = await guild.channels.fetch(config.modlogChannelId);

            if (channel && channel.type === 'GUILD_TEXT') {
                return channel;
            } else {
                return null;
            }
        } else {
            return null;
        }
    }
}
