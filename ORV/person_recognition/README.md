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

### to FIX:
> D:\School\Projekt\ORV\person_recognition\.venv\lib\site-packages\keras\src\trainers\epoch_iterator.py:107: UserWarning: Your input ran out of data; interrupting training. Make sure that your dataset or generator can generate at least `steps_per_epoch * epochs` batches. You may need to use the `.repeat()` function when building your dataset.
  self._interrupted_warning()

> Premalo data -> več slik na osebo
