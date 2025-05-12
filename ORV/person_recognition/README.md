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