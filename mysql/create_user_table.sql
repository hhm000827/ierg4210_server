CREATE TABLE USERS (
 userid int AUTO_INCREMENT PRIMARY KEY,
 email varchar(255) NOT NULL,
 password varchar(255) NOT NULL,
 isAdmin int NOT NULL
);
