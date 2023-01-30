CREATE TABLE PRODUCTS (
 pid int PRIMARY KEY,
 cid int NOT NULL,
 name varchar(255) NOT NULL,
 price float NOT NULL,
 img varchar(255) NOT NULL,
 inventory int NOT NULL,
 description varchar(255) NOT NULL,
 FOREIGN KEY(cid) REFERENCES CATEGORIES(cid) on delete cascade
);