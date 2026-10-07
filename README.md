# Custom Gauges Pack

Un pack complet de **4 cartes Lovelace personnalisées** pour Home Assistant, offrant des visualisations esthétiques et fonctionnelles pour afficher vos données de capteurs.

<table align="center"><tr>
<td align="center"><img src="https://raw.githubusercontent.com/Gileads/ha-custom-gauges/main/images/half-arc-gauge.png" width="200" alt="Jauge demi-arc"><br><sub>Demi-arc</sub></td>
<td align="center"><img src="https://raw.githubusercontent.com/Gileads/ha-custom-gauges/main/images/battery-ring.png" width="130" alt="Jauge ronde batterie"><br><sub>Batterie</sub></td>
<td align="center"><img src="https://raw.githubusercontent.com/Gileads/ha-custom-gauges/main/images/aiguille-puissance.png" width="200" alt="Jauge aiguille puissance"><br><sub>Aiguille puissance</sub></td>
<td align="center"><img src="https://raw.githubusercontent.com/Gileads/ha-custom-gauges/main/images/thermo-hygro.png" width="200" alt="Jauge thermo-hygro"><br><sub>Thermo-hygro</sub></td>
</tr></table>


## 📋 Contenu du Pack

### 1. **Half Arc Gauge** (`custom:half-arc-gauge`)

<p align="center"><img src="https://raw.githubusercontent.com/Gileads/ha-custom-gauges/main/images/half-arc-gauge.png" width="260" alt="Jauge demi-arc : style Classique (haut) et style Blocs (bas)"></p>

Jauge en demi-arc avec styles modernes et responsifs.

**Caractéristiques :**
- Deux demi-jauges superposables
- Styles "Classique" (dégradé + point mobile) ou "Blocs" (Garmin)
- Titre optionnel avec police Shadows Into Light
- Support de 0–4 mini-valeurs personnalisables
- Affichage des décimales configurable
- Design responsive via `clamp()`
- Fond transparent
- Éditeur visuel intégré

**Exemple de configuration :**
```yaml
type: custom:half-arc-gauge
entity: sensor.temperature
name: "Température"
min: 0
max: 50
unit: "°C"
```

---

### 2. **Battery Ring Gauge** (`custom:battery-ring-gauge`)

<p align="center"><img src="https://raw.githubusercontent.com/Gileads/ha-custom-gauges/main/images/battery-ring.png" width="200" alt="Jauges rondes batterie"></p>

Jauge circulaire style montre Garmin, idéale pour afficher l'état de batterie ou tout pourcentage.

**Caractéristiques :**
- Anneau complet façon montre Garmin
- Styles "classic" ou "blocks" (LED, épaisseur progressive)
- Tri automatique des entités via `auto_sort`
- Responsive : module ResizeObserver intégré
- Support `layout_align`
- Éditeur visuel intégré

**Exemple de configuration :**
```yaml
type: custom:battery-ring-gauge
entity: sensor.battery_level
style: classic
```

---

### 3. **Jauge Aiguille Puissance** (`custom:jauge-aiguille-puissance`)

<p align="center"><img src="https://raw.githubusercontent.com/Gileads/ha-custom-gauges/main/images/aiguille-puissance.png" width="260" alt="Jauge à aiguille rétro"></p>

Jauge rétro avec aiguille analogique pour afficher la consommation en watts.

**Caractéristiques :**
- Cadran rétro, balayage 270°
- Affichage digital de la valeur en watts
- Visuels détaillés : cerclage strié, vis de boîtier, zone rouge, plot de butée
- Reflet vitré et halo lumineux
- Polices Google : Oswald, Bebas Neue, Rajdhani, Teko, Aldrich, Michroma, Audiowide
- Tri automatique `auto_sort`
- Sections numériques et couleurs en éditeur visuel

**Exemple de configuration :**
```yaml
type: custom:jauge-aiguille-puissance
entity: sensor.power_consumption
max: 5000
```

---

### 4. **Jauge Thermo Hygro** (`custom:jauge-thermo-hygro`)

<p align="center"><img src="https://raw.githubusercontent.com/Gileads/ha-custom-gauges/main/images/thermo-hygro.png" width="260" alt="Jauge thermo-hygro"></p>

Double aiguille pour température et humidité, style instrument météo ancien.

**Caractéristiques :**
- Cadran double aiguille (température + humidité)
- Sous-cadran humidité en style "round" ou "arc"
- Croissant de lune en contrepoids (masque SVG)
- Polices Google : Jost, Barlow Condensed, Cormorant Garamond, Oswald, Rajdhani, Aldrich, Josefin Sans
- ~60+ paramètres de personnalisation
- Option native `card_transparent`
- Éditeur visuel complet

**Exemple de configuration :**
```yaml
type: custom:jauge-thermo-hygro
temperature_entity: sensor.temperature
humidity_entity: sensor.humidity
min_temp: -10
max_temp: 50
```

---

## 🔧 Module `card-transparent`

**Ressource transverse utilisée par :**
- `custom:half-arc-gauge`
- `custom:battery-ring-gauge`
- `custom:jauge-aiguille-puissance`

Ajoute le paramètre `card_transparent` pour créer un fond transparent personnalisé.

**Technique :** Patch de `setConfig` et `getConfigElement` via `customElements.whenDefined()`.

---

## 📦 Installation

### Via HACS (dépôt personnalisé)

1. Ouvrir HACS dans Home Assistant
2. Menu **⋮** (trois points) → **Dépôts personnalisés**
3. Dépôt : `https://github.com/Gileads/ha-custom-gauges`, Type : **Tableau de bord** (Dashboard)
4. Cliquer sur **Ajouter**, puis ouvrir **Custom Gauges Pack** et **Télécharger**
5. Rafraîchir la page du navigateur (Ctrl+F5)

HACS ajoute automatiquement la ressource Lovelace. Si tu avais déjà ajouté les fichiers à la main, supprime les anciennes ressources pour éviter les doublons.

### Manuel

1. Télécharger `dist/ha-custom-gauges.js`
2. Le copier dans `/config/www/custom-gauges/`
3. Ajouter la ressource (Paramètres → Tableaux de bord → ⋮ → Ressources) :
```yaml
url: /local/custom-gauges/ha-custom-gauges.js
type: module
```
4. Rafraîchir la page du navigateur

---

## 📚 Utilisation

Chaque carte dispose d'un **éditeur visuel intégré** dans Lovelace.

### Exemple Complet
```yaml
views:
  - title: Tableau de Bord
    cards:
      - type: custom:half-arc-gauge
        entity: sensor.temperature
        name: "Température Intérieure"
        min: 0
        max: 50
        card_transparent: true

      - type: custom:battery-ring-gauge
        entity: sensor.battery_smartphone
        style: classic

      - type: custom:jauge-aiguille-puissance
        entity: sensor.power_consumption
        max: 5000

      - type: custom:jauge-thermo-hygro
        temperature_entity: sensor.living_room_temperature
        humidity_entity: sensor.living_room_humidity
        min_temp: -10
        max_temp: 50
```

---

## 🐛 Dépannage

### Les cartes ne s'affichent pas
1. Vérifier la **console du navigateur** (F12) pour les erreurs
2. Vérifier que toutes les ressources JS sont correctement chargées
3. Effectuer un **rafraîchissement complet** : `Ctrl + Shift + R`
4. Vérifier que les entités existent dans Home Assistant

### Les polices ne s'affichent pas correctement
- Les cartes utilisent Google Fonts (chargement dynamique)
- Vérifier la connexion Internet
- Vérifier que le navigateur supporte le CSS moderne

---

## 🤝 Support et Contributions

- **Issues** : https://github.com/Gileads/ha-custom-gauges/issues
- **Discussions** : https://github.com/Gileads/ha-custom-gauges/discussions

---

## 📄 Licence

[MIT](LICENSE)

---

## 🙏 Remerciements

Pack de jauges personnalisées créé pour Home Assistant avec amour ! 💚

Testé sur Home Assistant 2021.12+

---

**Dernière mise à jour :** Octobre 2026  
**Version :** 1.0.0
