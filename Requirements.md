# MOSCOW First Draft

  

## Must Have

  

### Region Management

    * Stores will belong and act within a region

    * Each Region will have a supply hub

    * Supplies can come from supply hub, local suppliers, stores within region, and regions within 1000 miles

  

### Store Info

    * Communicate directly with other stores inside of their region

    * Own stock quantity

    * Sales data

  
  

### Machine Management

    * Keep track of maintnence schedule

    * Keep track of machine type

    * Keep track of machine status

        * running

        * repair-start

        * repair-end

        * error

        * critical error

        * out of order

        * service upcoming

    * Keep track of when the status is applied/changed

    * Keep track of how long until machine is inoperable

    * Keep track of repair staff location/status

  

### User Roles

  

#### Each role will have their own views/dashboards

    * Logistics Manager

        * Access to all relevant stock data

            * specific store stock in region

            * stock in region supply hubs

            * stock from regions within 1000 miles

            * stock available to purchase

        * Access to store sales data

        * Gives repair staff tasks

  

    * Repair Staff

        * Given store info

            * address

            * Machine type

            * Machine start date

            * Machine status

            * Status date

        * Keep track of location of stores and staff to optimize travel paths

  

    * Super Admin

        * Can access any store information

  

    * Admin

        * Access their own store information

        * Same Access as Manager

        * Manage user accounts (repair staff, managers)

        * Can add managers

  

    * Manager

        * Access their own store information

        * Access stock, user payments, revenue reports

        * change their machine status

  

    * User account

        * Can access their own information from any store

        * Store auto suggested based on location

            * Have favorite store, pickup time

  

    * Guest Account

        * no sign in necessary

        * can order drinks but no session info is saved

### Universal Drink ordering system

    * Drinks are universal in their makeup

        * a small is x oz, medium is y oz, and a large is z oz

        * syrup is quantized to a squirt (cant order a half squirt)

        * Ingredients share the same name everywhere

    * an order can contain many drinks

    * each drink does not have to fill the entire volume

    * ingredients added in different order are the same (mtn dew, lime, lemon is the same as lemon, mtn dew, lime)

    * ingredients combine if added out of order (1 lemon, 1 lime, 1 lemon -> 2 lemon, 1 lime)

  

## Should Have

### Regions

    * Contain Micro Regions

        * Micro regions will allow for repair staff to move around more efficiently

        * Micro regions will NOT have impenetrable borders

  

### Stores

    * Store specific drinks

    * Drinks in the order queue (ordered but not yet made)

    * organise other stores between micro and main region

    * upcoming maintenance schedule

    * total storage availability (can store 100 lbs of syrup, 30 different flavors, etc)

    * minimum stock before re-order

    * minimum stock required to allow transfer to other store

    * maximum stock of items

  

### Logistic Manager

    * Adjust minimum stock quantities to have on hand inside the supply hub

    * access all store stock info

        * minimum/maximum

        * minimum stock to allow transfers

### Manager

    * set store minimum/maximum stock

    * set store minimum allow to transfer value

    * request stock from other stores

    * deny stock transfer requests

  

## Could Have

### Stock

    * stock organized within micro regions so stock transfers are faster

    * predictive ordering based off of sales data

    * new suggested minimums based off of sales data

  
  

## Will not have