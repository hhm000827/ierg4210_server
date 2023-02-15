CREATE TABLE PRODUCTS (
 pid int AUTO_INCREMENT PRIMARY KEY,
 cid int NOT NULL,
 name varchar(255) NOT NULL,
 price float NOT NULL,
 img varchar(255) NOT NULL,
 inventory int NOT NULL,
 description varchar(255) NOT NULL,
 FOREIGN KEY(cid) REFERENCES CATEGORIES(cid) on delete cascade on update cascade
);

CREATE INDEX I1 ON PRODUCTS(cid);

insert into cart.PRODUCTS values (1,2,"saber",12,"1.jpg",3,"saber");
insert into cart.PRODUCTS values (2,2,"caster",15,"2.jpg",5,"caster");
insert into cart.PRODUCTS values (3,2,"foreigner",20,"3.jpg",3,"foreigner");
insert into cart.PRODUCTS values (4,3,"iws2000",20,"iws2000.jpeg",1,"iws2000");
insert into cart.PRODUCTS values (5,3,"kar98k",14,"5.jpg",4,"kar98k");
insert into cart.PRODUCTS values (6,3,"wa2000",20,"6.jpg",2,"wa2000");
insert into cart.PRODUCTS values (7,1,"bagpipe",20,"7.jpg",2,"bagpipe");
insert into cart.PRODUCTS values (8,1,"skadi",13,"8.jpg",5,"skadi");
insert into cart.PRODUCTS values (9,1,"mudrock",21,"9.jpg",4,"mudrock");
