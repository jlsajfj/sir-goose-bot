import { AES, enc } from 'crypto-js';
import express from 'express';
import UserModel from '../../models/user.model';

const router = express.Router();

router.get('/:encodedId', async (req, res) => {
    if (!process.env.AES_PASSPHRASE || !process.env.TENANT_ID || !process.env.CLIENT_ID || !process.env.SERVER_URI) {
        res.send(`The bot configuration was not setup correctly. Please notify ${process.env.OWNER_DISCORD_USERNAME} so they can fix it.`);
        return;
    }

    if (req.params.encodedId) {
        const decodedUID = AES.decrypt(req.params.encodedId.replace(/_/g, '/').replace(/-/g, '+'), process.env.AES_PASSPHRASE).toString(
            enc.Utf8
        );
        if (!decodedUID.endsWith('-sebot')) {
            res.send('Error: The link you followed appears to be malformed. Try requesting a new verification link.');
            return;
        }
        const discordId = decodedUID.replace('-sebot', '');

        await UserModel.updateOne({ discordId: discordId }, { $set: { verifiedClickedAt: new Date() } });

        res.redirect(
            `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/authorize?client_id=${process.env.CLIENT_ID}&response_type=code&redirect_uri=${process.env.SERVER_URI}/authorize&response_mode=query&scope=offline_access%20user.read&state=${req.params.encodedId}`
        );
    } else {
        res.send('Error: The link you followed appears to be malformed. Try requesting a new verification link.');
    }
});

export default router;
