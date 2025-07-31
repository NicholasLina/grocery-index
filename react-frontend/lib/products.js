const { createSlugMapping } = require('./slugUtils.js');

// Static fallback products list for build-time generation
// Updated to match actual StatCan database product names
const FALLBACK_PRODUCTS = [
    // Meat products
    'Beef stewing cuts, per kilogram',
    'Beef striploin cuts, per kilogram',
    'Beef top sirloin cuts, per kilogram',
    'Ground beef, per kilogram',
    'Beef rib cuts, per kilogram',
    'Pork loin cuts, per kilogram',
    'Pork rib cuts, per kilogram',
    'Pork shoulder cuts, per kilogram',
    'Whole chicken, per kilogram',
    'Chicken breasts, per kilogram',
    'Chicken thigh, per kilogram',
    'Chicken drumsticks, per kilogram',
    'Bacon, 500 grams',
    'Wieners, 400 grams',

    // Dairy products
    'Milk, 1 litre',
    'Milk, 2 litres',
    'Milk, 4 litres',
    'Cream, 1 litre',
    'Butter, 454 grams',
    'Block cheese, 500 grams',
    'Yogurt, 500 grams',
    'Eggs, 1 dozen',

    // Fruits
    'Apples, per kilogram',
    'Oranges, per kilogram',
    'Oranges, 1.36 kilograms',
    'Bananas, per kilogram',
    'Pears, per kilogram',
    'Lemons, unit',
    'Limes, unit',
    'Grapes, per kilogram',
    'Cantaloupe, unit',
    'Avocado, unit',
    'Strawberries, 454 grams',
    'Frozen strawberries, 600 grams',

    // Vegetables
    'Potatoes, 4.54 kilograms',
    'Potatoes, per kilogram',
    'Sweet potatoes, per kilogram',
    'Tomatoes, per kilogram',
    'Cabbage, per kilogram',
    'Carrots, 1.36 kilograms',
    'Onions, per kilogram',
    'Onions, 1.36 kilograms',
    'Celery, unit',
    'Cucumber, unit',
    'Mushrooms, 227 grams',
    'Broccoli, unit',
    'Peppers, per kilogram',
    'Squash, per kilogram',
    'Iceberg lettuce, unit',
    'Romaine lettuce, unit',
    'Salad greens, 142 grams',

    // Frozen foods
    'Frozen french fried potatoes, 750 grams',
    'Frozen green beans, 750 grams',
    'Frozen broccoli, 500 grams',
    'Frozen corn, 750 grams ',
    'Frozen mixed vegetables, 750 grams ',
    'Frozen peas, 750 grams',
    'Frozen pizza, 390 grams',
    'Frozen spinach, 300 grams',

    // Seafood
    'Canned tuna, 170 grams',
    'Canned salmon, 213 grams',
    'Salmon, per kilogram',
    'Shrimp, 300 grams',

    // Grains and bread
    'White bread, 675 grams',
    'Flatbread and pita, 500 grams ',
    'Dry or fresh pasta, 500 grams',
    'Cereal, 400 grams',
    'Wheat flour, 2.5 kilograms',
    'White sugar, 2 kilograms',
    'Brown rice, 900 grams ',
    'White rice, 2 kilograms',
    'Crackers and crisp breads, 200 grams ',
    'Cookies and sweet biscuits, 300 grams ',

    // Beverages
    'Apple juice, 2 litres',
    'Orange juice, 2 litres',
    'Roasted or ground coffee, 340 grams',
    'Tea (20 bags)',

    // Oils and condiments
    'Canola oil, 3 litres',
    'Olive oil, 1 litre',
    'Vegetable oil, 3 litres',
    'Ketchup, 1 litre',
    'Mayonnaise, 890 millilitres ',
    'Peanut butter, 1 kilogram',

    // Canned goods
    'Canned baked beans, 398 millilitres',
    'Canned tomatoes, 796 millilitres',
    'Canned soup, 284 millilitres',
    'Canned beans and lentils, 540 millilitres',
    'Canned corn, 341 millilitres',
    'Canned peach, 398 millilitres',
    'Canned pear, 398 millilitres',

    // Other staples
    'Dried lentils, 900 grams',
    'Dry beans and legumes, 900 grams ',
    'Baby food, 128 millilitres',
    'Infant formula, 900 grams ',

    // Plant-based alternatives
    'Meatless burgers, 226 grams',
    'Soy milk, 1.89 litres',
    'Nut milk, 1.89 litres',
    'Tofu, 350 grams ',

    // Nuts and snacks
    'Almonds, 200 grams',
    'Peanuts, 450 grams',
    'Sunflower seeds, 400 grams ',

    // Condiments and spreads
    'Hummus, 227 grams',
    'Salsa, 418 millilitres',
    'Pasta sauce, 650 millilitres',
    'Salad dressing, 475 millilitres',

    // Margarine
    'Margarine, 907 grams',

    // Personal care
    'Shampoo, 400 millilitres',
    'Deodorant, 85 grams',
    'Toothpaste, 100 millilitres',
    'Laundry detergent, 4.43 litres'
];

// Create slug mapping for fallback products
const FALLBACK_SLUG_MAPPING = createSlugMapping(FALLBACK_PRODUCTS);

module.exports = {
    FALLBACK_PRODUCTS,
    FALLBACK_SLUG_MAPPING
}; 