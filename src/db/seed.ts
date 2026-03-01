import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// ── Helpers ──────────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function priceToCents(price: string): number {
  const cleaned = price.replace("$", "");
  return Math.round(parseFloat(cleaned) * 100);
}

// ── Ensure data directory ────────────────────────────────────────────────────
const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log("Created data/ directory");
}

const dbPath = path.join(dataDir, "flavorjet.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

console.log(`Database: ${dbPath}\n`);

// ── Create Tables ────────────────────────────────────────────────────────────
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    profile_picture TEXT,
    phone TEXT,
    street TEXT,
    apartment TEXT,
    city TEXT,
    zip_code TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    bg_color TEXT NOT NULL DEFAULT '#f5f5f5',
    display_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS menu_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL,
    price INTEGER NOT NULL,
    image_url TEXT NOT NULL,
    rating TEXT NOT NULL DEFAULT '4.5',
    is_available INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS modifier_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    name TEXT NOT NULL,
    required INTEGER NOT NULL DEFAULT 0,
    min_select INTEGER NOT NULL DEFAULT 0,
    max_select INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    modifier_group_id INTEGER NOT NULL REFERENCES modifier_groups(id),
    name TEXT NOT NULL,
    price_adjustment INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cart_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    special_instructions TEXT
  );

  CREATE TABLE IF NOT EXISTS cart_item_modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cart_item_id INTEGER NOT NULL REFERENCES cart_items(id),
    modifier_id INTEGER NOT NULL REFERENCES modifiers(id)
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'confirmed',
    total INTEGER NOT NULL,
    delivery_address TEXT,
    delivery_phone TEXT,
    tip INTEGER NOT NULL DEFAULT 0,
    estimated_minutes INTEGER NOT NULL DEFAULT 30,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id),
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    item_name TEXT NOT NULL,
    special_instructions TEXT
  );

  CREATE TABLE IF NOT EXISTS order_item_modifiers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_item_id INTEGER NOT NULL REFERENCES order_items(id),
    modifier_id INTEGER NOT NULL REFERENCES modifiers(id),
    modifier_name TEXT NOT NULL,
    price_adjustment INTEGER NOT NULL
  );
`);

console.log("Tables created.\n");

// ── Seed Data ────────────────────────────────────────────────────────────────

interface SeedItem {
  name: string;
  price: string;
  rating: string;
  imageUrl: string;
  description: string;
}

interface SeedCategory {
  name: string;
  slug: string;
  description: string;
  bgColor: string;
  items: SeedItem[];
}

const categoriesData: SeedCategory[] = [
  {
    name: "Appetizers", slug: "appetizers",
    description: "Crispy starters and savory bites to kick off your meal.", bgColor: "#fef4ea",
    items: [
      { name: "Crispy Onion Rings", price: "$10.50", rating: "4.5", imageUrl: "https://media.istockphoto.com/id/1509699818/photo/food-photos-various-entrees-appetizers-deserts-etc.webp?b=1&s=170667a&w=0&k=20&c=dqaCVWEXDQ0Emra-D6eWgCNvmrpDqy3UbTHq3JwNbng=", description: "Crispy battered onion rings, served with a zesty dipping sauce." },
      { name: "Stuffed Jalapeno Poppers", price: "$11.99", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1355094124/photo/jalapeno-poppers-with-sour-cream.jpg?s=612x612&w=0&k=20&c=q7GBy17Va40sya4w6q0RZUF5e1rAWWQLnIoDy0zqSWE=", description: "Jalapeno peppers stuffed with cream cheese, lightly fried to perfection." },
      { name: "Caprese Bruschetta", price: "$11.99", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/1406627535/photo/bruschetta-with-tomatoes-and-cheese-mozarella-caprese.webp?b=1&s=170667a&w=0&k=20&c=wmQpHWAffXV-db6HifQwDzm32IpgaN2YJGbATOcqt0g=", description: "Toasted bread topped with fresh tomatoes, mozzarella, basil, and balsamic glaze." },
      { name: "Spinach and Artichoke Dip", price: "$10.00", rating: "4.8", imageUrl: "https://media.istockphoto.com/id/1349067634/photo/artichoke-spinach-dip.webp?b=1&s=170667a&w=0&k=20&c=v7Gc4lhVU1KdqNGEeIC2fRkthvSf8hK3cNQSgB94-kY=", description: "Creamy dip made with spinach, artichokes, and melted cheese." },
      { name: "Shrimp Cocktail", price: "$9.50", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/164634228/photo/two-bowls-of-shrimp-ceviche-with-wedges-of-lime.jpg?s=612x612&w=0&k=20&c=DCs69YCiXF2nTTYC8rJDOGZOTdYygz_7SJ3mZQszShk=", description: "Chilled shrimp served with a tangy cocktail sauce and lemon wedges." },
      { name: "Vegetable Spring Rolls", price: "$10.00", rating: "4.5", imageUrl: "https://images.pexels.com/photos/8141457/pexels-photo-8141457.jpeg?cs=srgb&dl=pexels-ruslan-khmelevsky-8141457.jpg&fm=jpg", description: "Crispy spring rolls filled with a medley of fresh vegetables, served with sweet chili sauce." },
    ],
  },
  {
    name: "Salads", slug: "salads",
    description: "Fresh and vibrant salads to keep you refreshed.", bgColor: "#e9f4e3",
    items: [
      { name: "Classic Caesar Salad", price: "$8.50", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1363770772/photo/homemade-caesar-salad-with-chicken.webp?b=1&s=170667a&w=0&k=20&c=g2UURRr_sQyNduF6qQvuKfGzTSvD6cvhN1eHiGiQOuU=", description: "Romaine lettuce, croutons, parmesan cheese, and Caesar dressing." },
      { name: "Greek Salad", price: "$11.50", rating: "4.6", imageUrl: "https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=1000&q=80", description: "Mixed greens, olives, feta cheese, tomatoes, cucumbers, and Greek dressing." },
      { name: "Caprese Salad", price: "$10.00", rating: "4.8", imageUrl: "https://staticcookist.akamaized.net/wp-content/uploads/sites/22/2022/06/caprese-salad-1200x675.jpg", description: "Fresh tomatoes, mozzarella cheese, basil leaves, olive oil, and balsamic glaze." },
      { name: "Asian Sesame Chicken Salad", price: "$12.50", rating: "4.5", imageUrl: "https://goodeggs4.imgix.net/6971c505-fd8b-4b3a-9268-559930baec47.jpg?w=840&h=525&fm=jpg&q=80&fit=crop", description: "Grilled chicken, mixed greens, mandarin oranges, and crispy wontons with sesame dressing." },
      { name: "Mediterranean Chickpea Salad", price: "$11.50", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/663290162/photo/vegetarian-stew-with-chickpeas.jpg?s=612x612&w=0&k=20&c=xzf98TWYHAirWN2VJAIJrTB9vnyLEn-hJLBuGQ1Q4yw=", description: "Chickpeas, cucumbers, tomatoes, red onions in a lemon-oregano dressing." },
      { name: "Fruit and Nut Salad", price: "$8.50", rating: "4.5", imageUrl: "https://media.istockphoto.com/id/587933012/photo/fruit-salad.jpg?s=612x612&w=0&k=20&c=H0YhUiYpz9st-Xw6eoUbp80sClLSttjBUZoHLMhLLyQ=", description: "Mixed fruits, nuts, and greens with a light vinaigrette dressing." },
    ],
  },
  {
    name: "Soups", slug: "soups",
    description: "Comforting soups to warm your soul.", bgColor: "#faeaea",
    items: [
      { name: "Tomato Basil Soup", price: "$10.50", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/689537488/photo/tomato-soup-in-a-black-bowl-on-grey-stone-background-top-view-copy-space.webp?b=1&s=170667a&w=0&k=20&c=Zi8HajMy0RFSHRkJGEFTr0mCxKAc7Q7XS0eGJ-kV-ao=", description: "Creamy tomato soup infused with fresh basil leaves." },
      { name: "Chicken Noodle Soup", price: "$9.50", rating: "4.7", imageUrl: "https://img.delicious.com.au/zN_WxdEj/w759-h506-cfill/del/2021/07/chicken-coconut-curry-noodle-soup-recipe-thai-khao-soi-155681-3.jpg", description: "Hearty soup with tender chicken, vegetables, and noodles in a flavorful broth." },
      { name: "Minestrone Soup", price: "$8.50", rating: "4.5", imageUrl: "https://img.taste.com.au/Eod5ChVP/w720-h480-cfill-q80/taste/2021/04/speedy-vegetarian-winter-minestrone-170960-2.jpg", description: "Traditional Italian vegetable soup with beans and pasta." },
      { name: "Lentil Soup", price: "$11.50", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/1177028196/photo/pumpkin-carrot-cream-soup-in-a-bowl-grey-background-top-view-copy-space.webp?b=1&s=170667a&w=0&k=20&c=7lALG3QIEBC9sJ4_oGEcrHwMwoKt29NpDaqw75S1clU=", description: "Hearty soup made with lentils, vegetables, and spices." },
      { name: "Clam Chowder", price: "$12.00", rating: "4.8", imageUrl: "https://media.istockphoto.com/id/1161819591/photo/creamy-seafood-chowder-soup-with-corn-and-parsley.jpg?s=612x612&w=0&k=20&c=hGrqN4NOQwBj6dhkRUncv7h9RsVPx8dIk2I3JB1Xkts=", description: "Creamy soup made with clams, potatoes, and vegetables." },
      { name: "Spicy Pumpkin Soup", price: "$7.50", rating: "4.7", imageUrl: "https://images.slurrp.com/prodrich_article/40lxqrby0r6.webp?impolicy=slurrp-20210601&width=880&height=500", description: "Smooth and spicy pumpkin soup garnished with pumpkin seeds." },
    ],
  },
  {
    name: "Pasta and Noodles", slug: "pasta-and-noodles",
    description: "Hand-crafted pasta and flavorful noodle dishes.", bgColor: "#eeeef9",
    items: [
      { name: "Spaghetti Carbonara", price: "$10.50", rating: "4.8", imageUrl: "https://www.tastingtable.com/img/gallery/simple-spaghetti-carbonara-recipe/intro-1670253292.jpg", description: "Spaghetti pasta tossed with eggs, cheese, pancetta, and pepper." },
      { name: "Shrimp Alfredo Pasta", price: "$11.50", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1308229866/photo/pasta-spaghetti-with-grilled-shrimps-bechamel-sauce-spaghetti-with-seafood-rich-cream.webp?b=1&s=170667a&w=0&k=20&c=4nyA3DatFRUXBQy-z7iWz9ChJfT-JAM0qbl-hENVH30=", description: "Fettuccine pasta in a creamy Alfredo sauce with succulent shrimp." },
      { name: "Vegetable Lo Mein", price: "$11.00", rating: "4.6", imageUrl: "https://4.bp.blogspot.com/-e5ANdssqBPk/W4CDQEICCSI/AAAAAAAAH_Y/qcxALBYUDp0FWlFoQtwW08cQREayF1d6QCLcBGAs/s1600/fullsizeoutput_6d7c.jpeg", description: "Chinese stir-fried noodles with a variety of colorful vegetables." },
      { name: "Penne Arrabiata", price: "$8.50", rating: "4.5", imageUrl: "https://media.istockphoto.com/id/482964545/photo/arrabiata-pasta.webp?b=1&s=170667a&w=0&k=20&c=Xr6u4yjlOfsyI02Ni0IohSDoUhGWDc8DnyTImN_2G9I=", description: "Penne pasta in a spicy tomato sauce with garlic and red pepper flakes." },
      { name: "Linguine", price: "$7.50", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1413148149/photo/spaghetti-pasta-with-vongole-seashells-and-parmesan-cheese-in-plate.webp?b=1&s=170667a&w=0&k=20&c=4sCHFrQlwkXTyNP6NUQtSrQe9orNtHRksdzfulWamZc=", description: "Linguine pasta with a medley of seafood in a white wine and garlic sauce." },
      { name: "Mushroom Risotto", price: "$9.00", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/618456728/photo/mushroom-risotto-served-in-a-bowl-selective-focus.webp?b=1&s=170667a&w=0&k=20&c=LAVU9yQ2MRlQp9AAgH7dPr1u_5PXnsiC2_VINvB-ims=", description: "Creamy risotto with sauteed mushrooms and parmesan cheese." },
    ],
  },
  {
    name: "Burgers", slug: "burgers",
    description: "Mouth-watering burgers and sandwiches for every craving.", bgColor: "#f7f6d7",
    items: [
      { name: "Classic Beef Burger", price: "$11.50", rating: "4.8", imageUrl: "https://media.istockphoto.com/id/1413669079/photo/cheeseburger-with-grilled-red-bell-pepper-arugula-and-dill-pickles.webp?b=1&s=170667a&w=0&k=20&c=UGS6eWNjR17DBl-DkYZJA8zGoGPfaeuJSOmwmK49mmg=", description: "Juicy beef patty, lettuce, tomato, cheese, and pickles on a toasted bun." },
      { name: "Grilled Chicken Sandwich", price: "$8.50", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1450668296/photo/ham-and-cheese-sandwich-on-black-plate-top-view.webp?b=1&s=170667a&w=0&k=20&c=Yn15MiFjzNVfpo3ygSJ5q5S1QcMUilTkZGxlASKv3qI=", description: "Grilled chicken breast, lettuce, tomato, and mayo on a toasted bun." },
      { name: "Vegetarian Portobello Burger", price: "$9.50", rating: "4.5", imageUrl: "https://media.istockphoto.com/id/1323194107/photo/plant-based-black-bean-burger-on-a-sesame-seed-bun.webp?b=1&s=170667a&w=0&k=20&c=Nwx5HKMzgfRR-witE9bITxcJ-SdUDfW9VNHTh8OY534=", description: "Portobello mushroom, lettuce, tomato, and special sauce on a toasted bun." },
      { name: "Spicy Black Bean Burger", price: "$12.50", rating: "4.6", imageUrl: "https://foodhub.scene7.com/is/image/woolworthsltdprod/087-bean-burger:Square-1300x1300", description: "Black bean patty, lettuce, tomato, and chipotle mayo on a toasted bun." },
      { name: "Turkey and Avocado Wrap", price: "$12.00", rating: "4.7", imageUrl: "https://static.diabetesfoodhub.org/system/thumbs/system/images/recipes/560-diabetic-lunch-turkey-avocado-wrap_AdobeStock7330035_022321_3885281428.jpg", description: "Sliced turkey, avocado, lettuce, and tomato wrapped in a whole-grain tortilla." },
      { name: "Fish Tacos", price: "$9.00", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/1370639809/photo/fish-taco-with-salsa-salad-feta-cheese-sriracha-sauce-in-a-crispy-taco-shell.webp?b=1&s=170667a&w=0&k=20&c=15FzN61m8dL2qJ3vT1PvcRxq-Le1RD1BEKt3YGPM7k8=", description: "Grilled fish fillet, lettuce, tomato, and tangy sauce in soft corn tortillas." },
    ],
  },
  {
    name: "Pizza", slug: "pizza",
    description: "Delicious pizzas with a variety of toppings.", bgColor: "#fef4ea",
    items: [
      { name: "Margherita Pizza", price: "$12.50", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1414575281/photo/a-delicious-and-tasty-italian-pizza-margherita-with-tomatoes-and-buffalo-mozzarella.webp?b=1&s=170667a&w=0&k=20&c=pobf9fs5EsiNZMuyrq_44Y3LT8c4cz7_jmxvgQPclY4=", description: "Classic pizza with tomato, mozzarella, and fresh basil." },
      { name: "Pepperoni Pizza", price: "$12.00", rating: "4.8", imageUrl: "https://media.istockphoto.com/id/1442417585/photo/person-getting-a-piece-of-cheesy-pepperoni-pizza.webp?b=1&s=170667a&w=0&k=20&c=27qSFEznalRWqZ5iAgm4fnM6u_TgIqsgUWb3qLTn-Hk=", description: "Pizza topped with pepperoni and mozzarella cheese." },
      { name: "Vegetarian Supreme Pizza", price: "$11.50", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/1297290376/photo/vegetarian-pizza-with-broccoli-cherry-tomato-pepper-and-mushrooms.webp?b=1&s=170667a&w=0&k=20&c=iVAWXJHuI-JBbI2IJ_Cq7lBmjoODu2IHEwFk2vUxi9k=", description: "Pizza loaded with assorted vegetables and mozzarella cheese." },
      { name: "Hawaiian Pizza", price: "$10.50", rating: "4.5", imageUrl: "https://media.istockphoto.com/id/1360522777/photo/image-of-unrecognisable-person-selecting-pizza-slice-various-toppings-including-hawaiian.webp?b=1&s=170667a&w=0&k=20&c=s_fnoLSYbF1hRYNbZNYjbOdtQn2BRr4lA9Htj_SL-HE=", description: "Pizza with ham, pineapple, and mozzarella cheese." },
      { name: "BBQ Chicken Pizza", price: "$11.00", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1340589333/photo/homemade-indian-chicken-tikka-masala-pizza.webp?b=1&s=170667a&w=0&k=20&c=C3VC4zOkie0p06V5W7f6JJvZSBiDgqX1nz0J1uqVu3M=", description: "Pizza topped with BBQ chicken, onions, and mozzarella cheese." },
      { name: "Supreme Meat Lovers Pizza", price: "$6.50", rating: "4.8", imageUrl: "https://cdn.pixabay.com/photo/2017/12/10/14/47/pizza-3010062_640.jpg", description: "Pizza piled high with various meats and mozzarella cheese." },
    ],
  },
  {
    name: "Seafood", slug: "seafood",
    description: "Tantalizing seafood dishes for seafood lovers.", bgColor: "#e9f4e3",
    items: [
      { name: "Grilled Salmon", price: "$11.50", rating: "4.7", imageUrl: "https://static01.nyt.com/images/2022/08/17/dining/12Apperex-Shrimp/merlin_210401388_0537fbb9-39e8-40a0-ad3b-252fb2f6a806-master768.jpg", description: "Grilled salmon fillet served with steamed vegetables and lemon-dill sauce." },
      { name: "Shrimp Scampi", price: "$12.50", rating: "4.8", imageUrl: "https://media.istockphoto.com/id/1444934713/photo/shrimps-prepared-with-garlic.webp?b=1&s=170667a&w=0&k=20&c=vNGIWDIK0iT7eQF7uhe9drF6-abJTCnjodtk0O-U_z4=", description: "Sauteed shrimp in garlic butter and white wine sauce served over linguine." },
      { name: "Lobster Tail", price: "$10.00", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1025237574/photo/cooked-lobster-tails-with-lemon-dill.webp?b=1&s=170667a&w=0&k=20&c=y3Ktu05LaUAYX0q06BoLb64Cr6bBlD-rSIdAXouZhiM=", description: "Lobster tail broiled with butter and garlic, served with mashed potatoes." },
      { name: "Paella", price: "$8.50", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/965484922/photo/spanish-seafood-paella-with-mussels-shrimps-and-chorizo-sausages-in-traditional-pan-on-wooden.jpg?s=612x612&w=0&k=20&c=PopOnKCIHGxFfa6qPjmrqrE152Q-mvebQXiiTSzAu-4=", description: "Spanish-style paella with a mix of seafood, rice, and vegetables." },
      { name: "Fish and Chips", price: "$9.50", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1493534069/photo/traditional-fish-and-chips-takeout.webp?b=1&s=170667a&w=0&k=20&c=tbOZrSwf_2p_05bTvENan6gj539iHpKr9SP2J1HnFU0=", description: "Battered and fried fish fillets, served with crispy fries and tartar sauce." },
      { name: "Crab Cakes", price: "$9.00", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/542832092/photo/crab-cakes.webp?b=1&s=170667a&w=0&k=20&c=p6JcF9hwj-rHrEl_Q9AaDP7WgCTc8Tq_swKhAZxBfcw=", description: "Delicious crab cakes made with lump crab meat, served with remoulade sauce." },
    ],
  },
  {
    name: "Desserts", slug: "desserts",
    description: "Sweet treats to end your meal on a high note.", bgColor: "#faeaea",
    items: [
      { name: "Chocolate Lava Cake", price: "$6.50", rating: "4.8", imageUrl: "https://media.istockphoto.com/id/534476640/photo/lava-cake.webp?b=1&s=170667a&w=0&k=20&c=gw-RBdfYDRHJWPmRfeZN39kQDQYJayIJvzTccntflQ8=", description: "Warm, gooey chocolate cake with a molten center, served with vanilla ice cream." },
      { name: "New York Cheesecake", price: "$8.50", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1146489000/photo/stawberry-cheesecake.webp?b=1&s=170667a&w=0&k=20&c=Y6OOWpd--HNhn8ys2E5RRpUo6-HOuzs9gqIcPxd8D8c=", description: "Creamy and rich New York-style cheesecake, topped with your choice of fruit compote." },
      { name: "Tiramisu", price: "$9.50", rating: "4.8", imageUrl: "https://media.istockphoto.com/id/1398679790/photo/tiramisu-cake-on-white-ceramic-plate.webp?b=1&s=170667a&w=0&k=20&c=o85bGWcmKlITF7NDc0jhKY2abkIDxIDpGykAocFsOs8=", description: "Classic Italian dessert made with layers of coffee-soaked ladyfingers and mascarpone cheese." },
      { name: "Fruit Tart", price: "$10.50", rating: "4.6", imageUrl: "https://www.brookshirebrothers.com/sites/default/files/inline-images/Fruit%20Tart.jpg", description: "Buttery tart shell filled with a layer of creamy custard and topped with fresh fruits." },
      { name: "Creme Brulee", price: "$11.00", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1147248293/photo/creme-brulee-dessert-with-caramel-crust-and-berries.webp?b=1&s=170667a&w=0&k=20&c=18bcWVHtoap7jYV4WBOEIVJ1jfjU58AdI0z0VwGR0Ww=", description: "Creamy vanilla custard topped with a layer of caramelized sugar." },
      { name: "Red Velvet Cupcake", price: "$12.00", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/1198280368/photo/valentines-red-velvet-cupcakes-on-a-rustic-wooden-table.webp?b=1&s=170667a&w=0&k=20&c=_jO7xBiyHHy-BYMIH4zXmU7K4o2D3sR7N2QUqpufDG4=", description: "Moist red velvet cupcake with cream cheese frosting and a sprinkle of red velvet crumbs." },
    ],
  },
  {
    name: "Steaks and Grills", slug: "steaks-and-grills",
    description: "Premium cuts grilled to perfection.", bgColor: "#eeeef9",
    items: [
      { name: "Ribeye Steak", price: "$10.00", rating: "4.9", imageUrl: "https://media.istockphoto.com/id/1367228911/photo/grilled-tomahawk-beef-steak-rib-eye-with-thyme-black-background-top-view.webp?b=1&s=170667a&w=0&k=20&c=XP-dAxe0ebjaHy7vgQjI13JxINB3gjiGTQOiTX3isNk=", description: "Juicy and flavorful ribeye steak, grilled to perfection and served with mashed potatoes and sauteed vegetables." },
      { name: "Filet Mignon", price: "$11.50", rating: "4.8", imageUrl: "https://img.freepik.com/premium-photo/plate-steaks-with-tomatoes-greens_987032-13402.jpg", description: "Tender filet mignon, seasoned and grilled to your preference, accompanied by a red wine reduction sauce." },
      { name: "BBQ Baby Back Ribs", price: "$12.50", rating: "4.8", imageUrl: "https://images.unsplash.com/photo-1593030668930-8130abedd2b0?w=1000&q=80", description: "Fall-off-the-bone baby back ribs, slow-cooked and glazed with a tangy barbecue sauce." },
      { name: "Grilled Lamb Chops", price: "$13.00", rating: "4.7", imageUrl: "https://media.istockphoto.com/id/1093395034/photo/grilled-new-zealand-lamb-chops-plated-with-sauteed-brussel-sprouts.webp?b=1&s=170667a&w=0&k=20&c=efTO_GK9WXYH3bsgGaLLlgDQB_S5KinIqZEfKY-M_s0=", description: "Succulent lamb chops marinated with herbs and spices and served with rosemary roasted potatoes." },
      { name: "T-Bone Steak", price: "$12.00", rating: "4.9", imageUrl: "https://media.istockphoto.com/id/1310148007/photo/grilled-bbq-t-bone-steak-or-porterhouse-steak-with-fresh-rosemary-american-cuisine-restaurant.webp?b=1&s=170667a&w=0&k=20&c=tZdD8KFmed73hEhgeUcA2OnvEZfxVas4Uq9dFpEoT5A=", description: "Flavorful T-bone steak, seasoned and grilled, served with baked sweet potato and garlic butter broccoli." },
      { name: "Grilled Vegetable Platter", price: "$9.50", rating: "4.6", imageUrl: "https://media.istockphoto.com/id/1134749964/photo/grilled-vegetables-on-a-plate-with-sauce.webp?b=1&s=170667a&w=0&k=20&c=Nh1DJHTy7tFtXpf8VtZTuwat_B0c66Cxkz1Qwq92AG8=", description: "Assorted grilled vegetables including bell peppers, zucchini, and asparagus, drizzled with balsamic glaze." },
    ],
  },
];

// ── Modifier definitions ─────────────────────────────────────────────────────
interface SeedModifierGroup {
  name: string;
  required: boolean;
  minSelect: number;
  maxSelect: number;
  modifiers: { name: string; priceAdjustment: number }[];
}

const modifiersByItem: Record<string, SeedModifierGroup[]> = {
  "Margherita Pizza": [
    { name: "Size", required: true, minSelect: 1, maxSelect: 1, modifiers: [
      { name: "Small", priceAdjustment: -200 }, { name: "Medium", priceAdjustment: 0 },
      { name: "Large", priceAdjustment: 300 }, { name: "Extra Large", priceAdjustment: 500 },
    ]},
    { name: "Extra Toppings", required: false, minSelect: 0, maxSelect: 3, modifiers: [
      { name: "Extra Cheese", priceAdjustment: 150 }, { name: "Mushrooms", priceAdjustment: 100 },
      { name: "Olives", priceAdjustment: 100 }, { name: "Jalapenos", priceAdjustment: 75 },
      { name: "Bell Peppers", priceAdjustment: 75 },
    ]},
    { name: "Crust Type", required: true, minSelect: 1, maxSelect: 1, modifiers: [
      { name: "Thin Crust", priceAdjustment: 0 }, { name: "Thick Crust", priceAdjustment: 100 },
      { name: "Stuffed Crust", priceAdjustment: 250 },
    ]},
  ],
  "Classic Beef Burger": [
    { name: "Size", required: true, minSelect: 1, maxSelect: 1, modifiers: [
      { name: "Regular", priceAdjustment: 0 }, { name: "Double Patty", priceAdjustment: 400 },
      { name: "Triple Patty", priceAdjustment: 700 },
    ]},
    { name: "Extras", required: false, minSelect: 0, maxSelect: 4, modifiers: [
      { name: "Extra Cheese", priceAdjustment: 100 }, { name: "Bacon", priceAdjustment: 200 },
      { name: "Avocado", priceAdjustment: 150 }, { name: "Fried Egg", priceAdjustment: 150 },
      { name: "Caramelized Onions", priceAdjustment: 75 },
    ]},
    { name: "Side", required: false, minSelect: 0, maxSelect: 1, modifiers: [
      { name: "Regular Fries", priceAdjustment: 250 }, { name: "Sweet Potato Fries", priceAdjustment: 350 },
      { name: "Onion Rings", priceAdjustment: 300 }, { name: "Coleslaw", priceAdjustment: 200 },
    ]},
  ],
  "Spaghetti Carbonara": [
    { name: "Portion", required: true, minSelect: 1, maxSelect: 1, modifiers: [
      { name: "Regular", priceAdjustment: 0 }, { name: "Large", priceAdjustment: 350 },
    ]},
    { name: "Add-ons", required: false, minSelect: 0, maxSelect: 3, modifiers: [
      { name: "Extra Parmesan", priceAdjustment: 100 }, { name: "Grilled Chicken", priceAdjustment: 300 },
      { name: "Garlic Bread", priceAdjustment: 250 }, { name: "Side Salad", priceAdjustment: 300 },
    ]},
  ],
  "Classic Caesar Salad": [
    { name: "Size", required: true, minSelect: 1, maxSelect: 1, modifiers: [
      { name: "Regular", priceAdjustment: 0 }, { name: "Large", priceAdjustment: 300 },
    ]},
    { name: "Protein", required: false, minSelect: 0, maxSelect: 1, modifiers: [
      { name: "Grilled Chicken", priceAdjustment: 350 }, { name: "Grilled Shrimp", priceAdjustment: 500 },
      { name: "Grilled Salmon", priceAdjustment: 600 }, { name: "Tofu", priceAdjustment: 250 },
    ]},
    { name: "Dressing", required: true, minSelect: 1, maxSelect: 1, modifiers: [
      { name: "Caesar", priceAdjustment: 0 }, { name: "Ranch", priceAdjustment: 0 },
      { name: "Balsamic Vinaigrette", priceAdjustment: 0 }, { name: "Italian", priceAdjustment: 0 },
    ]},
  ],
  "Ribeye Steak": [
    { name: "Doneness", required: true, minSelect: 1, maxSelect: 1, modifiers: [
      { name: "Rare", priceAdjustment: 0 }, { name: "Medium Rare", priceAdjustment: 0 },
      { name: "Medium", priceAdjustment: 0 }, { name: "Medium Well", priceAdjustment: 0 },
      { name: "Well Done", priceAdjustment: 0 },
    ]},
    { name: "Side", required: true, minSelect: 1, maxSelect: 1, modifiers: [
      { name: "Mashed Potatoes", priceAdjustment: 0 }, { name: "Baked Potato", priceAdjustment: 100 },
      { name: "French Fries", priceAdjustment: 50 }, { name: "Steamed Vegetables", priceAdjustment: 0 },
      { name: "Sweet Potato Fries", priceAdjustment: 150 },
    ]},
    { name: "Sauce", required: false, minSelect: 0, maxSelect: 1, modifiers: [
      { name: "Peppercorn Sauce", priceAdjustment: 200 }, { name: "Mushroom Sauce", priceAdjustment: 200 },
      { name: "Garlic Butter", priceAdjustment: 150 }, { name: "Bearnaise", priceAdjustment: 250 },
    ]},
  ],
};

// ── Run seed ─────────────────────────────────────────────────────────────────
const insertCategory = sqlite.prepare(
  `INSERT INTO categories (name, slug, description, image_url, bg_color, display_order) VALUES (?, ?, ?, ?, ?, ?)`
);
const insertMenuItem = sqlite.prepare(
  `INSERT INTO menu_items (category_id, name, slug, description, price, image_url, rating, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
);
const insertModifierGroup = sqlite.prepare(
  `INSERT INTO modifier_groups (menu_item_id, name, required, min_select, max_select) VALUES (?, ?, ?, ?, ?)`
);
const insertModifier = sqlite.prepare(
  `INSERT INTO modifiers (modifier_group_id, name, price_adjustment) VALUES (?, ?, ?)`
);

const seed = sqlite.transaction(() => {
  // Clear existing data
  sqlite.exec("DELETE FROM order_item_modifiers");
  sqlite.exec("DELETE FROM order_items");
  sqlite.exec("DELETE FROM orders");
  sqlite.exec("DELETE FROM cart_item_modifiers");
  sqlite.exec("DELETE FROM cart_items");
  sqlite.exec("DELETE FROM modifiers");
  sqlite.exec("DELETE FROM modifier_groups");
  sqlite.exec("DELETE FROM menu_items");
  sqlite.exec("DELETE FROM categories");

  console.log("Cleared existing data.\n");

  const menuItemIdByName: Record<string, number> = {};

  categoriesData.forEach((cat, catIndex) => {
    const categoryImageUrl = cat.items[0]?.imageUrl ?? "";
    const catResult = insertCategory.run(cat.name, cat.slug, cat.description, categoryImageUrl, cat.bgColor, catIndex + 1);
    const categoryId = catResult.lastInsertRowid as number;
    console.log(`Category: ${cat.name} (id=${categoryId})`);

    cat.items.forEach((item) => {
      const itemResult = insertMenuItem.run(
        categoryId, item.name, slugify(item.name), item.description,
        priceToCents(item.price), item.imageUrl, item.rating
      );
      const menuItemId = itemResult.lastInsertRowid as number;
      menuItemIdByName[item.name] = menuItemId;
    });
  });

  console.log("\nInserting modifiers...");
  for (const [itemName, groups] of Object.entries(modifiersByItem)) {
    const menuItemId = menuItemIdByName[itemName];
    if (!menuItemId) { console.warn(`WARNING: "${itemName}" not found`); continue; }
    console.log(`  Modifiers for: ${itemName}`);

    for (const group of groups) {
      const groupResult = insertModifierGroup.run(menuItemId, group.name, group.required ? 1 : 0, group.minSelect, group.maxSelect);
      const groupId = groupResult.lastInsertRowid as number;

      for (const mod of group.modifiers) {
        insertModifier.run(groupId, mod.name, mod.priceAdjustment);
      }
    }
  }
});

console.log("Running seed transaction...\n");
seed();

// ── Verify ───────────────────────────────────────────────────────────────────
const catCount = sqlite.prepare("SELECT COUNT(*) as count FROM categories").get() as { count: number };
const itemCount = sqlite.prepare("SELECT COUNT(*) as count FROM menu_items").get() as { count: number };
const groupCount = sqlite.prepare("SELECT COUNT(*) as count FROM modifier_groups").get() as { count: number };
const modCount = sqlite.prepare("SELECT COUNT(*) as count FROM modifiers").get() as { count: number };

console.log("\n--- Seed Summary ---");
console.log(`Categories:      ${catCount.count}`);
console.log(`Menu items:      ${itemCount.count}`);
console.log(`Modifier groups: ${groupCount.count}`);
console.log(`Modifiers:       ${modCount.count}`);
console.log("Seeding complete!");

sqlite.close();
