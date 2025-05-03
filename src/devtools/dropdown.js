document.addEventListener('DOMContentLoaded', function() {
    // Get the hamburger menu button and dropdown
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    // Toggle dropdown when hamburger is clicked
    if (hamburgerMenu && dropdownMenu) {
        hamburgerMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdownMenu.classList.toggle('active');
        });
        
        // Add click event listeners to all dropdown buttons
        const dropdownButtons = dropdownMenu.querySelectorAll('button');
        dropdownButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Hide dropdown when any button is clicked
                dropdownMenu.classList.remove('active');
            });
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function(e) {
            if (!dropdownMenu.contains(e.target) && !hamburgerMenu.contains(e.target)) {
                dropdownMenu.classList.remove('active');
            }
        });
    }
});
