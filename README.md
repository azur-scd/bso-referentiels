# Application d'alignement de référentiels disciplinaires

![forthebadge](/app/static/img/forthebadge.svg)

![screenshot](/app/static/img/screenshot.png)

Cette application met à disposition une interface graphique d'alignement de catégories disciplinaires entre les 3 référentiels suivants
- la classification dewey (classification de référence dans le set de données de thèses.fr disponible en Open data, variable oai_sets)
- le référentiel des domaines scientifiques d'Aurehal (classification de référence des publications déposées dans Hal)
- les catégories disciplinaires utilisées dans la baromètre de la science ouverte national (variable bso_classification du jeu de données).

L'objectif est d'ensuite s'appuyer sur ce mapping afin de pouvoir réconcilier les différents datasets constitués dans le cadre du baromètre science ouverte local UCA, et ce afin d'être en capacié de construire des vues et indicateurs disciplinaires globaux (sur les publications et les thèses notamment) dans l'analyse du taux d'ouverture de la production scientifique locale.

En backend les classes disciplinaires alignées sont modélisées en graphe et stockées dans une base de données Neo4J.

Un ensemble d'endpoints d'API Rest sont également délivrés afin d'exposer le mapping dans un format structuré et de le rendre interopérable pour être exploité, notamment par les différents workflows de constitution et d'enrichissements des données du baromètre.

## Initialisation de la base de données

Avant de pouvoir aligner les référentiels, il faut  - évidemment - tout d'abord les charger dans la base de données Neo4j.

La méthodologie (et le code Python) de récupération puis de chargement sous forme de noeuds et de liens hiérachiques est décrite dans le notebook init_db_load/notebook_get_data.ipynb

## Installation

### Avec Docker

#### 1ère possibilité : builder l'application et la base de donnée dans un seul conteneur

A la racine du projet

```
docker build -t <YOUR_IMAGE_NAME>:<YOUR_IMAGE_TAG> .
docker run --name <YOUR_CONTENEUR_NAME> -p 7474:7474 -p 7687:7687 -p 5000:5000 -d -v <YOUR_PATH>/neo4j/data:/data -v <YOUR_PATH>/neo4j/logs:/logs -v <YOUR_PATH>/neo4j/import:/var/lib/neo4j/import -v <YOUR_PATH>/neo4j/plugins:/plugins --env NEO4J_AUTH=neo4j/admin --env NEO4JLABS_PLUGINS=["apoc"] <YOUR_IMAGE_NAME>:<YOUR_IMAGE_TAG>
```

Si vous êtes sous Windows, ajouter les variables d'environnement suivantes dans la commande (cf [https://neo4j.com/developer/docker-run-neo4j/](https://neo4j.com/developer/docker-run-neo4j/))

```
--env NEO4J_AUTH=<YOUR_DB_USER>/<YOUR_DB_PASSWORD> --env NEO4J_dbms_connector_https_advertised__address="localhost:7473" --env NEO4J_dbms_connector_http_advertised__address="localhost:7474" --env NEO4J_dbms_connector_bolt_advertised__address="localhost:7687"
```

L'application est accessible sur le port 5000 [http://localhost:5000/bso-referentiels](http://localhost:5000/bso-referentiels) et l'interface graphique (browser) de Neo4j sur le port 7474 [http://localhost:7474/browser/](http://localhost:7474/browser/)

> Vous pouvez modifier le subpath de l'url 'bso-referentiels' dans app/.env

> Les identifiants (username/password) de la base de donnée Ne4j sont passés avec la variable d'environnement --env NEO4J_AUTH=neo4j/admin dans la commande de run du conteneur. Ils peuvent bien sûr être changés, il fudra alors veiller à reporter vos nouveaux identifiants dans app/.env et app/static/js/network.je

#### 2ème possibilité : builder 2 conteneurs séparés pour l'application et la bdd

A la racine du projet

```
docker-compose up
```
L'application est accessible sur le port 5000 [http://localhost:5000/bso-referentiels](http://localhost:5000/bso-referentiels) et l'interface graphique (browser) de Neo4j sur le port 7474 [http://localhost:7474/browser/](http://localhost:7474/browser/)

> Vous pouvez modifier le subpath de l'url 'bso-referentiels' dans app/.env

> Les identifiants (username/password) de la base de donnée Ne4j sont passés avec la variable d'environnement NEO4J_AUTH dans le fichier .env. Ils peuvent bien sûr être changés, il fudra alors veiller à reporter vos nouveaux identifiants dans app/.env et app/static/js/network.je

### Sans Docker

- Installer une instance Neo4j et créer une base de données
- Cloner le dépôt Git 
- Dans app/ :
  - créer un environnement virtuel et l'activer
  - installer les dépendances pip install -r requirements.txt
  - configurer vos identifiants Neo4j dans .env et static/js/network.js
  - Lancer en mode dev : python app.py
  - lancer en prod : gunicorn --bind=0.0.0.0:5000 wsgi:app 

## Todo

Doc swagger de l'API