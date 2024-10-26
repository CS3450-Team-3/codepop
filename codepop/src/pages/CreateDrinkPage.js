import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import NavBar from '../components/NavBar';
import DropDown from '../components/DropDown';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { sodaOptions, syrupOptions, juiceOptions } from '../components/Ingredients';

const CreateDrinkPage = () => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState('');
  const [selectedSize, setSize] = useState(null);
  const [selectedIce, setIce] = useState(null);
  const [openDropdown, setOpenDropdown] = useState({
    sodas: false,
    syrups: false,
    juices: false,
  });

  const filterOptions = (options = []) => {
    return options.filter((option) =>
      option.label.toLowerCase().includes(searchText.toLowerCase())
    );
  };

  const addItemToDrinkObject = () => {

  };

  const addToCart = (selectedOption) => {
    // create drink object and add the drinks to the cart
    // also navigate to the cart
    console.log(selectedOption, ' added to drink object');
  };

  const generateDrinks = () => {
    // add AI stuff to generate random drinks
    console.log('generating drinks...');
  };

  const saveDrink = async () => {
    // Add your logic to generate a drink object in the database
    console.log('Generating drinks...');
    
    // Example of an asynchronous database call
    await createDrinkObject(); // Replace with your actual function for saving to the database
  };

  const handleSaveDrinks = async () => {
    await saveDrink(); // Wait for the drink to be generated
    navigation.navigate('Cart'); // Then navigate to the cart page
  };
  
  const handleSearch = (text) => {
    setSearchText(text);

    // Open all dropdowns when text is entered
    setOpenDropdown({
      sodas: !!text,
      syrups: !!text,
      juices: !!text,
    });
  };

  // handle selection of ice ammount and drink size
  const handleSizeSelection = (size) => {
    setSize(size); // Update selected size
  };
  const handleIceSelection = (ice) => {
    setIce(ice); // Update selected size
  };

  return (
    <View style={styles.wholePage}>

      {/* Size buttons */}
      <View style={styles.buttonContainer}>
        {['16oz', '24oz', '32oz'].map((size) => (
          <TouchableOpacity
            key={size}
            onPress={() => handleSizeSelection(size)}
            style={[
              styles.circularButton,
              selectedSize === size && styles.circularButtonSelected, // Apply selected style if size is selected
            ]}
          >
            {/* <Text style={styles.buttonText}>{size}</Text> */}
            <Text style={[styles.buttonText, selectedSize === size && styles.selectedButtonText]}>
              {size}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ice buttons */}
      <View style={styles.buttonContainer}>
        {['No Ice', 'Light', 'Regular', 'Extra'].map((ice) => (
          <TouchableOpacity
            key={ice}
            onPress={() => handleIceSelection(ice)}
            style={[
              styles.circularButton,
              selectedIce === ice && styles.circularButtonSelected, // Apply selected style if size is selected
            ]}
          >
            <Text style={[styles.buttonText, selectedIce === ice && styles.selectedButtonText]}>{ice}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text>Drink GIF goes here</Text>

      <TouchableOpacity onPress={() => [handleSaveDrinks(), navigation.navigate('Cart')]} style={styles.button}>
        <Text style={styles.buttonText}>Generate Drinks</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => addToCart()} style={styles.button}>
        <Text style={styles.buttonText}>Add to Cart</Text>
      </TouchableOpacity>

      <TextInput
        placeholder="Search ingredients"
        style={styles.searchInput}
        value={searchText}
        onChangeText={handleSearch}
      />

      <DropDown 
      title="Sodas" 
      options={filterOptions(sodaOptions)} 
      onSelect={addItemToDrinkObject} 
      isOpen={openDropdown.sodas}
      setOpen={() => setOpenDropdown(prev => ({ ...prev, sodas: !prev.sodas }))}
      />

      <DropDown 
      title="Syrups" 
      options={filterOptions(syrupOptions)} 
      onSelect={addItemToDrinkObject} 
      isOpen={openDropdown.syrups}
      setOpen={() => setOpenDropdown(prev => ({ ...prev, syrups: !prev.syrups }))}
      />

      <DropDown 
      title="Juices" 
      options={filterOptions(juiceOptions)} 
      onSelect={addItemToDrinkObject} 
      isOpen={openDropdown.juices}
      setOpen={() => setOpenDropdown(prev => ({ ...prev, juices: !prev.juices }))}
      />

      <NavBar />
    </View>
  );
};

const styles = StyleSheet.create({
  wholePage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFA686',
  },
  button: {
    backgroundColor: '#D30C7B',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    margin: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Space buttons evenly
    width: '80%', // Adjust width as needed
    marginVertical: 20,
  },
  circularButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F92758',
    margin: 5, // Adds spacing between buttons
  },
  circularButtonSelected: {
    borderColor: '#8DF1D3', // Color for selected state
    backgroundColor: '#E8F5E9',
  },
  selectedButtonText: {
    color: '#000', // Black color for selected text
  },
  searchInput: {
    height: 40,
    borderColor: '#ddd',
    borderWidth: 1,
    paddingHorizontal: 10,
    width: '80%',
    marginVertical: 15,
    borderRadius: 5,
  },
});

export default CreateDrinkPage;