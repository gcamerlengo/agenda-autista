-- Passo 1 di 2: nuovo ruolo. Va eseguito DA SOLO, prima di 0002b
-- (Postgres non permette di usare un valore nuovo di un enum nella stessa esecuzione).
alter type ruolo add value if not exists 'presidente';
