CREATE TABLE RECORDS (
 id int AUTO_INCREMENT PRIMARY KEY,
 email varchar(255) NOT NULL,
 record varchar(1000) NOT NULL,
 products varchar(1000) NOT NULL,
 time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);