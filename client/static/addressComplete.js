function initAutocompleteWidget() {
    // The google.maps.places library is now available
    const placeAutocompleteElement = new google.maps.places.PlaceAutocompleteElement();

    // Insert the interactive input field into the DIV container
    // Ensure 'autocomplete-container' exists in your HTML
    document.getElementById('autocomplete-input').appendChild(placeAutocompleteElement);

    // Listen for the user selecting an address from the dropdown ('gmp-select')
    placeAutocompleteElement.addEventListener('gmp-select', async ({placePrediction}) => {
        
        // Fetch the selected address details (just the formatted address for submission)
        const place = placePrediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress'] });

        // Update the hidden input field that your Flask form uses
        // Ensure 'selected_address_data' exists in your HTML
        document.getElementById('selected_address_data').value = place.formattedAddress;
    });
}

// Use a DOMContentLoaded listener to ensure the HTML elements are ready before the script runs.
document.addEventListener('DOMContentLoaded', () => {
    // Check every 100ms if the Google Maps object is ready
    // (since the Maps API script is loaded with async/defer, we wait for the global 'google' object).
    const interval = setInterval(() => {
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            clearInterval(interval);
            // Call the function to initialize the widget once the Google API is ready
            initAutocompleteWidget();
        }
    }, 100);
});