# Flusso — Finanze personali

Flusso è una dashboard personale per registrare e controllare entrate, spese, stipendio e budget mensili.

## Funzioni

- Registrazione di entrate e spese
- Categorie di spesa
- Stipendio configurabile per ogni mese
- Saldo iniziale mensile
- Budget personalizzati per categoria
- Calcolo automatico del risparmio
- Grafici e riepiloghi mensili
- Backup completo in formato JSON
- Ripristino dei dati tramite file di backup
- Interfaccia responsive per computer e smartphone

## Salvataggio dei dati

I dati vengono salvati localmente nel browser tramite `localStorage`.

Questo significa che:

- ricaricando o chiudendo il sito, i dati rimangono;
- dispositivi e browser diversi conservano dati separati;
- cancellando i dati del browser si possono perdere le informazioni;
- il backup JSON permette di trasferire o ripristinare tutti i dati.

I dati finanziari non vengono caricati su GitHub.

## Backup

Per creare una copia dei dati:

1. Apri **Impostazioni**.
2. Premi **Scarica backup**.
3. Conserva il file JSON in un luogo sicuro.

Per recuperare i dati:

1. Apri **Impostazioni**.
2. Premi **Carica backup**.
3. Seleziona il file JSON precedentemente scaricato.
4. Conferma la sostituzione dei dati presenti nel browser.

## Tecnologie

Il progetto utilizza solamente:

- HTML
- CSS
- JavaScript

Non richiede installazione, compilazione o server.

## Pubblicazione

Il sito può essere pubblicato gratuitamente tramite GitHub Pages.

## Utilizzo

Progetto personale per la gestione delle proprie finanze.
