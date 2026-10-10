#!/bin/bash
# Let the app user create Prisma's temporary shadow databases (used by `prisma migrate dev`)
set -e
mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
GRANT ALL PRIVILEGES ON \`prisma\_migrate\_shadow\_db%\`.* TO '$MYSQL_USER'@'%';
FLUSH PRIVILEGES;
SQL
