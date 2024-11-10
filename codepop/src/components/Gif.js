import React from 'react';
import { View, StyleSheet } from 'react-native';

const Gif = ({ layers }) => {
  return (
    <View style={styles.gifContainer}>
      {/* Render layers stacked from the bottom */}
      {layers.map((layer, index) => (
        <View
          key={index}
          style={[
            styles.layer,
            { 
              backgroundColor: layer.color, 
              height: `${layer.height}%`,
              bottom: `${index * (100 / layers.length)}%`,  // Stack from bottom
            },
          ]}
        />
      ))}
      {/* Add a straw to the cup */}
      <View style={styles.straw} />
    </View>
  );
};

const styles = StyleSheet.create({
  gifContainer: {
    width: 150,  // Top width
    height: 250,
    borderWidth: 1,
    borderColor: 'black',
    borderTopLeftRadius: 30,  // Wider radius on top-left
    borderTopRightRadius: 30,  // Wider radius on top-right
    borderBottomLeftRadius: 50,  // Smaller radius on bottom-left
    borderBottomRightRadius: 50,  // Smaller radius on bottom-right
    overflow: 'hidden',
    position: 'relative',  // For absolute positioning of layers
    backgroundColor: '#FFA686', // Cup background color
    justifyContent: 'flex-end', // Position layers at the bottom
    margin: 10,
  },
  layer: {
    position: 'absolute',
    width: '100%',
    bottom: 0, // Stack layers from bottom
  },
  straw: {
    position: 'absolute',
    top: -10, // Move the straw above the top of the cup
    left: '50%',
    width: 10,
    height: 50,
    backgroundColor: 'gray',  // Straw color
    borderRadius: 5,
    transform: [{ translateX: -5 }],  // Center straw horizontally
    zIndex: 1, // Ensure straw appears on top of everything else
  },
});

export default Gif;

