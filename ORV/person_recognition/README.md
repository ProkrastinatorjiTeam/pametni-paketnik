## Struktura map
- data/raw ima mape oseb ki vsebuje slike te osebe,
- data/train sem bom premaknil slike za učenje modela
- data/test Tukaj pa bodo slike za testiranje

## prepare_data.py
- skripta ki uporablja knjižnico shutil za premikanje slik. 
- Naključno izbere slike za train in test od tega 80% gre za učenje
- Mapa vsake osebe mora imeti vsaj dve sliki te osebe

## build_model.py
- ustvarjanje modela za prepoznavo oseb
- uporaba https://github.com/keras-team/keras/tree/v3.3.3 za izdelavo lastnega modela
- nalaganje slik in izgradnja preprostega CNN modela

## fixed
- v model.fit(train_dataset, epochs=EPOCHS, validation_data=test_dataset) sem odstranil argumenta
steps_per_epoch, tako zdaj Keras sam ugotovi koliko batchov je v datasetu
> UserWarning: Your input ran out of data; interrupting training. Make sure that your dataset or generator can generate at least `steps_per_epoch * epochs` batches. You may need to use the `.repeat()` function when building your dataset.
  self._interrupted_warning()

# Opazki pri buildanju modela
- Model se nauči na učnih podatkiv(accuracy je na koncu 77%(Epoch 20/20))
- Slab rezultat na validaticiji(accurassy 17%)

> Torej Model se uči - loss gre dol in accuracy narašča. Model si zapomni te učne primere ampak potem jih ne 
> posplošiti na novih slikah(overfitting). Torej in IRL je useless tale model.

# Kaj moram spremljati

- loss, accuracy po epochs

# Kaj moram spreminjat(se igrati)

- EPOCH
- BATCH_SIZE
- Learning rate LR

# Namigi za naš projekt

- V->C1(32)->C2(64)->MP->V->C1(64)->C2(128)->MP->V->C1(129)->C2(256)->MP->1000->

> Posodobil nevrnsko mrezo po zgornji arthitekturi


# Spremembe

- ločil embedding model od klasifikatorja
- shranjevanje najboljšega modeza, uporabil sem ModelCheckpoint
- dodal vizualizacijo treniranja