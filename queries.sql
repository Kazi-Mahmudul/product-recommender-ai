CREATE DATABASE product_recommender;

CREATE USER 'product_user'@'localhost' IDENTIFIED BY 'secure_password';

GRANT ALL PRIVILEGES ON product_recommender.* TO 'product_user'@'localhost';

FLUSH PRIVILEGES;