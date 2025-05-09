export const languages = {
  en: {
    settings: "Extension Settings",
    spotifyCredentials: "Spotify Credentials",
    spotifyNote: "Enter your Spotify API credentials from your Spotify Developer Dashboard",
    clientId: "Client ID",
    clientSecret: "Client Secret",
    youtubeApiKey: "YouTube API Key",
    youtubeNote: "Enter your YouTube Data API v3 key from Google Cloud Console",
    saveChanges: "Save Changes",
    clearAll: "Clear All",
    testConnection: "Test Connection",
    success: "Settings saved successfully",
    error: "Error saving settings",
    cleared: "All settings cleared",
    required: "All fields are required",
    connectionSuccess: "Spotify connection successful! 🎉",
    connectionFailed: "Connection failed"
  },
  sq: {
    settings: "Cilësimet e Zgjatjes",
    spotifyCredentials: "Kredencialet e Spotify",
    spotifyNote: "Vendosni kredencialet tuaja të API Spotify nga Paneli i Zhvilluesve Spotify",
    clientId: "ID e Klientit",
    clientSecret: "Sekreti i Klientit",
    youtubeApiKey: "Çelësi API i YouTube",
    youtubeNote: "Vendosni çelësin tuaj YouTube Data API v3 nga Google Cloud Console",
    saveChanges: "Ruaj Ndryshimet",
    clearAll: "Pastro të Gjitha",
    testConnection: "Testo Lidhjen",
    success: "Cilësimet u ruajtën me sukses",
    error: "Gabim në ruajtjen e cilësimeve",
    cleared: "Të gjitha cilësimet u pastruan",
    required: "Të gjitha fushat janë të detyrueshme",
    connectionSuccess: "Lidhja me Spotify u krye me sukses! 🎉",
    connectionFailed: "Lidhja dështoi"
  },
  nl: {
    settings: "Extensie Instellingen",
    spotifyCredentials: "Spotify Inloggegevens",
    spotifyNote: "Voer uw Spotify API-inloggegevens in vanaf uw Spotify Developer Dashboard",
    clientId: "Client ID",
    clientSecret: "Client Secret",
    youtubeApiKey: "YouTube API Sleutel",
    youtubeNote: "Voer uw YouTube Data API v3 sleutel in van Google Cloud Console",
    saveChanges: "Wijzigingen Opslaan",
    clearAll: "Alles Wissen",
    testConnection: "Test Verbinding",
    success: "Instellingen succesvol opgeslagen",
    error: "Fout bij opslaan instellingen",
    cleared: "Alle instellingen gewist",
    required: "Alle velden zijn verplicht",
    connectionSuccess: "Spotify-verbinding succesvol! 🎉",
    connectionFailed: "Verbinding mislukt"
  },
  it: {
    settings: "Impostazioni Estensione",
    spotifyCredentials: "Credenziali Spotify",
    spotifyNote: "Inserisci le tue credenziali API Spotify dal Dashboard Sviluppatori Spotify",
    clientId: "ID Cliente",
    clientSecret: "Segreto Cliente",
    youtubeApiKey: "Chiave API YouTube",
    youtubeNote: "Inserisci la tua chiave YouTube Data API v3 da Google Cloud Console",
    saveChanges: "Salva Modifiche",
    clearAll: "Cancella Tutto",
    testConnection: "Prova Connessione",
    success: "Impostazioni salvate con successo",
    error: "Errore nel salvare le impostazioni",
    cleared: "Tutte le impostazioni cancellate",
    required: "Tutti i campi sono obbligatori",
    connectionSuccess: "Connessione Spotify riuscita! 🎉",
    connectionFailed: "Connessione fallita"
  }
};

export const availableLanguages = [
  {
    code: 'en',
    name: 'English',
    flag: '🇬🇧'
  },
  {
    code: 'sq',
    name: 'Shqip',
    flag: '🇦🇱'
  },
  {
    code: 'de',
    name: 'Deutsch',
    flag: '🇩🇪'
  }
];

export function getLanguageName(code) {
  const language = availableLanguages.find(lang => lang.code === code);
  return language ? language.name : 'Unknown';
}

export function getLanguageFlag(code) {
  const language = availableLanguages.find(lang => lang.code === code);
  return language ? language.flag : '🌐';
}

export function isValidLanguage(code) {
  return availableLanguages.some(lang => lang.code === code);
}