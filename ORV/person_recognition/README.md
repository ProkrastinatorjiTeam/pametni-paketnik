# Sistem za Prepoznavanje Obrazov z Uporabo Prenosnega Učenja (VGGFace)

Ta projekt implementira sistem za prepoznavanje obrazov, ki temelji na prenosnem učenju z uporabo pred-treniranega modela VGGFace (VGG16 arhitektura). Sistem omogoča registracijo novih uporabnikov z zajemom obraznih slik, treniranje personaliziranega modela in nato verifikacijo identitete uporabnika.

## Struktura Projekta

-   `data/`: Glavna mapa za podatke.
    -   `data/train/{ime_osebe}/`: Slike, uporabljene za treniranje modelov.
    -   `data/validation/{ime_osebe}/`: Slike, uporabljene za validacijo med treniranjem.
    -   `data/test/{ime_osebe}/`: Slike za končno, neodvisno testiranje modela (niso uporabljene med treniranjem ali validacijo).
-   `models/{username}/`: Mapa, kamor se shranjujejo natrenirani modeli za vsakega uporabnika.
    -   `best_vggface_model.keras`: Najboljši model, shranjen med treniranjem na podlagi validacijske točnosti.
    -   `full_vggface_model.keras`: Model po zaključku celotnega procesa treniranja (vključno s finim nastavljanjem).
-   `new_user.py`: Skript za registracijo novega uporabnika. Zajame slike obraza, jih pripravi in shrani v `data/`.
-   `build_model.py`: Skript za treniranje modela za specifičnega uporabnika. Uporablja slike iz `data/train` in `data/validation` ter VGGFace (VGG16) kot osnovo za prenosno učenje.
-   `verification.py`: Skript za sistematično evaluacijo natreniranega modela na testnem naboru podatkov (iz `data/test/`).

## Tehnologije in Knjižnice

-   Python 3.x
-   TensorFlow & Keras
-   Keras-VGGFace (za model VGGFace VGG16 in predprocesiranje)
-   OpenCV (za zajem in obdelavo slik)
-   NumPy
-   Matplotlib (za vizualizacijo rezultatov treniranja)
-   Scikit-learn (za metrike evaluacije)
-   Shutil (v `prepare_data.py` za operacije z datotekami)

## Navodila za Uporabo

### 1. Predpogoji

-   Namestite potrebne Python knjižnice:
    ```bash
    pip install tensorflow opencv-python keras-vggface numpy matplotlib scikit-learn
    ```
-   Prepričajte se, da imate delujočo spletno kamero.

### 2. Priprava Podatkov za Novega Uporabnika

1.  **Zajem Slik (če še nimate slik za uporabnika):**
    *   Zaženite skript `new_user.py`. Vnesite ime novega uporabnika (npr. "janez_novak").
        ```bash
        python new_user.py
        ```
    *   Sledite navodilom na zaslonu. Skript bo uporabil kamero za zajem 100 slik obraza in jih shranil v `data/(train,validation,test)/username`.
    *   Poskrbite za dobro osvetlitev in različne kote/izraze obraza.

### 3. Treniranje Modela

1.  Pri pripravi podatkov z new_user.py se na koncu sam zažene build_model.py username, kar natrenira model za ta nov user
2.  Primer:
    ```bash
    python build_model.py janez_novak
    ```
3.  Skript bo:
    *   Naložil pred-treniran model VGGFace (VGG16).
    *   Zamrznil konvolucijske plasti in treniral novo dodano klasifikacijsko glavo.
    *   Nato bo odmrznil nekatere zgornje plasti VGGFace modela za fino nastavljanje (fine-tuning) z nižjo učno stopnjo.
    *   Shranil bo najboljši model (`best_vggface_model.keras`) in končni model (`full_vggface_model.keras`) v mapo `models/{uporabnisko_ime}/`.
    *   Prikazal bo grafe uspešnosti treniranja (točnost in izguba skozi epohe).

### 4. Sistematična Evaluacija Modela

1.  Če želite bolj podrobno oceno uspešnosti modela, pripravite ločen testni nabor slik v `data/test/{uporabnisko_ime}/` in `data/test/not_user/` (slike, ki jih model še ni videl).
2.  Za preverjanje, ali sistem pravilno prepozna registriranega uporabnika, zaženite skript `verification.py`:
    ```bash
    python verification.py <uporabnisko_ime>
    ```
3. Primer:
    ```bash
    python verification.py janez_novak
    ```
4.  Skript bo izračunal metrike, kot so točnost, matrika zmede, ter poročilo o klasifikaciji.

## Razvoj in Izboljšave Modela

Prvotni poskusi z lastno grajenim CNN modelom so pokazali težave s prekomernim prilagajanjem (overfitting) – visoka točnost na učnih podatkih, a slaba posplošitev na validacijskih/novih podatkih.

Zato je bil pristop spremenjen v **prenosno učenje z VGGFace (VGG16):**
-   **Osnovni model:** Uporabljene so pred-trenirane uteži modela VGG16, naučene na ogromnem naboru obrazov (VGGFace dataset). Te plasti so odlične za izločanje relevantnih značilk obraza.
-   **Klasifikacijska glava:** Na vrh osnovnega modela je dodana nova, manjša klasifikacijska glava, prilagojena za binarno klasifikacijo (uporabnik vs. ne-uporabnik).
-   **Dvostopenjsko treniranje:**
    1.  Najprej se trenira samo nova klasifikacijska glava, medtem ko so plasti osnovnega modela zamrznjene.
    2.  Nato se nekatere zgornje plasti osnovnega modela odfrznejo in celoten model se fino nastavlja (fine-tunes) z zelo majhno učno stopnjo.
-   **Regularizacija in Callbacks:**
    -   Uporabljeni so Dropout in L2 regularizacija za zmanjšanje overfittinga.
    -   `ModelCheckpoint`: Shranjuje najboljšo verzijo modela med treniranjem glede na `val_accuracy`.
    -   `ReduceLROnPlateau`: Samodejno zmanjšuje učno stopnjo, če se validacijska izguba ne izboljšuje.
    -   `EarlyStopping`: Ustavi treniranje, če ni napredka, in povrne uteži najboljšega modela.
-   **Podatkovna augmentacija:** Med treniranjem se na učnih slikah izvajajo naključne transformacije (npr. horizontalni obrat, sprememba svetlosti/kontrasta, rotacija), da se poveča robustnost modela in zmanjša overfitting.
-   **Uravnoteženje razredov:** Če je število slik za `username` in `not_user` neuravnoteženo, se uporabijo uteži razredov (`class_weights`) za boljše učenje.

Ta pristop običajno vodi do bistveno boljših rezultatov in hitrejše konvergence v primerjavi z učenjem globokega modela iz nič na manjših naborih podatkov.
