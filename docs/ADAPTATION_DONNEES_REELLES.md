# Adaptation du Frontend et Backend aux Données Réelles

## Résumé des modifications

Le code a été adapté pour utiliser dynamiquement les données réelles de la base de données PostgreSQL au lieu des constantes hardcodées.

## Modifications effectuées

### 1. FilterPanel (`src/components/Layout/FilterPanel.tsx`)

**Avant** : Utilisait des constantes hardcodées depuis `mockData.ts`
**Après** : Utilise `useFilterOptions()` pour récupérer dynamiquement les options depuis le backend

**Changements** :
- Import de `useFilterOptions` au lieu de `mockData`
- Affichage des données dynamiques avec gestion du chargement
- Troncature des noms longs pour l'affichage (avec `title` pour le texte complet)
- Gestion des valeurs NULL pour les content types
- Ajout de styles `.loading` et `.emptyState` pour les états de chargement

### 2. GeographySection (`src/components/Sections/GeographySection.tsx`)

**Avant** : Utilisait `EU_COUNTRIES` hardcodé pour mapper les langues
**Après** : Utilise les données réelles des entrées pour calculer la distribution par langue

**Changements** :
- Suppression de la dépendance à `EU_COUNTRIES`
- Calcul de la distribution des langues à partir des données réelles
- Les pays sont déjà des codes ISO (2 lettres) dans les données, donc pas besoin de mapping

### 3. chartConfig (`src/utils/chartConfig.ts`)

**Avant** : Couleurs hardcodées pour 8 plateformes et 7 types de décisions spécifiques
**Après** : Système dynamique de génération de couleurs avec fallback

**Changements** :
- Fonction `getPlatformColor()` : Génère des couleurs de manière cohérente pour n'importe quelle plateforme
- Fonction `getDecisionTypeColor()` : Génère des couleurs de manière cohérente pour n'importe quel type de décision
- Conservation des couleurs connues pour les plateformes populaires
- Utilisation d'un hash de chaîne pour générer des couleurs cohérentes
- Proxy pour maintenir la compatibilité avec le code existant

### 4. Composants de graphiques

**Modifications pour gérer les noms avec espaces et majuscules** :

- **PlatformsSection** : Troncature et nettoyage des noms de plateformes
- **ContentTypeSection** : Gestion des valeurs NULL et troncature
- **LegalGroundsSection** : Nettoyage avec `.trim()` et troncature pour les noms longs

## Données réelles dans la base

D'après la vérification API (`/api/verification`) :

- **57 plateformes** (vs 8 prévues initialement)
  - Exemples : Google Shopping, Temu, Pinterest, EMAG.RO, AliExpress, etc.
  
- **16 catégories** (vs 12 prévues)
  - Format : " OTHERVIOLATIONTC", " UNSAFEANDPROHIBITEDPRODUCTS", etc.
  - Note : Certains noms ont des espaces au début
  
- **5 types de décisions** (vs 7 prévus)
  - Visibility Restriction (83.72%), Removal (11.25%), Warning Label (4.27%), etc.
  
- **3 bases légales** (vs 10 prévues)
  - " INCOMPATIBLECONTENT" (99.92%), " ILLEGALCONTENT" (0.08%), etc.
  
- **5 types de contenu** (vs 6 prévus)
  - Product (86.11%), NULL (12.7%), Text, Image, Video, Audio

## Points importants

### Gestion des espaces
- Les noms dans la base peuvent avoir des espaces au début/fin
- Utilisation de `.trim()` partout où les noms sont affichés
- Les filtres fonctionnent avec les noms exacts (y compris espaces)

### Gestion des noms longs
- Troncature automatique pour l'affichage dans les graphiques
- Utilisation de l'attribut `title` pour afficher le nom complet au survol
- Limites de caractères adaptées selon le contexte (20-35 caractères)

### Couleurs dynamiques
- Les plateformes inconnues reçoivent des couleurs générées de manière cohérente
- Les couleurs sont basées sur un hash de la chaîne, donc toujours les mêmes pour la même plateforme
- Compatibilité maintenue avec le code existant via Proxy

### Performance
- Les options de filtres sont mises en cache pendant 30 minutes
- Les données de modération sont mises en cache pendant 5 minutes
- Pas d'impact sur les performances avec les données réelles

## Tests recommandés

1. **Vérifier les filtres** : Tester que tous les filtres fonctionnent avec les données réelles
2. **Vérifier les graphiques** : S'assurer que tous les graphiques s'affichent correctement
3. **Vérifier les couleurs** : Vérifier que les couleurs sont cohérentes et lisibles
4. **Vérifier les noms longs** : Tester avec des noms très longs pour s'assurer qu'ils sont bien tronqués
5. **Vérifier les valeurs NULL** : Tester que les valeurs NULL sont bien gérées

## Prochaines étapes (optionnelles)

1. **Nettoyer les données** : Supprimer les espaces en début/fin des noms dans la base de données
2. **Normaliser les noms** : Standardiser le format des noms (majuscules/minuscules)
3. **Ajouter des alias** : Créer un mapping pour afficher des noms plus lisibles tout en gardant les originaux pour les filtres
4. **Améliorer les couleurs** : Ajouter plus de couleurs connues pour les plateformes populaires

## Fichiers modifiés

- `src/components/Layout/FilterPanel.tsx`
- `src/components/Layout/FilterPanel.module.css`
- `src/components/Sections/GeographySection.tsx`
- `src/components/Sections/PlatformsSection.tsx`
- `src/components/Sections/ContentTypeSection.tsx`
- `src/components/Sections/LegalGroundsSection.tsx`
- `src/utils/chartConfig.ts`

## Compatibilité

Toutes les modifications sont rétrocompatibles. Le code existant continue de fonctionner grâce à l'utilisation de Proxy pour `PLATFORM_COLORS` et `DECISION_TYPE_COLORS`.

