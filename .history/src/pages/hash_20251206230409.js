import bcrypt from 'bcrypt';
const SALT_ROUNDS = 10;
const newPassword = "Password123!"; // ⬅️ Mot de passe TRÈS SIMPLE pour le test

bcrypt.hash(newPassword, SALT_ROUNDS)
    .then(hash => {
        console.log("NOUVEAU HACHAGE À COPIER :", hash);
        process.exit();
    })
    .catch(err => console.error(err));