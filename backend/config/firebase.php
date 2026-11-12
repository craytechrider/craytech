<?php

return [

    'credentials' => env(
        'FIREBASE_CREDENTIALS',
        'firebase-credentials.json'
    ),

    'database_url' => env(
        'FIREBASE_DATABASE_URL'
    ),

];
