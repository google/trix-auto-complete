**Autocomplete plugin for Trix editor**

This is a plugin that brings autocomplete to the Trix editor.
This is not an official google product.

**How to Use**

In order to use this plugin, the Trix editor must be used and a dropdown
container element must be added. The plugin can be initialized by calling the
autocomplete constructor and then called by calling autoCompleteHandler()
on each trix-change event. The constructor must be passed the trix editor, the editor element,
the dropdown container and an array of objects. Each object must contain the following
properties.

- Trigger. Potential terms that should be completed
- Replace. What the completed term should be.
- Search. Potential completed terms.
- Template. How to style each drop down menu item
The following properties are optional.
- Index.
- Extract. How to extract the value from the drop down menu item.

An example of the strategy object
```
{
   index: 1,
   trigger: /\[([A-Za-z0-9]*)\],
   replace: function(data, startingPosition) {
      editor.setSelectedRange(startingPosition);
      editor.insertString(data);
   },
   search: function(term, callback) {
      let matches = _(dictionary).filter(e => e.indexOf(term) === 0);
      callback(matches.slice(0, 10).value());
   }
   template: function(value) {
      return angular.element('<a>').append(value);
   }
}
```

This would search for all terms that match the trigger function. Then, the term that matches
the trigger function would be passed into the search function starting from the 1st index
since the index is 1. The values that result from the search function would then be passed into
the template function to populate the drop down menu. Finally, when a drop down item is selected,
the HTML of the drop down item will be passed into the replace function and replace the term that
initially triggered the drop down menu. If the user doesn't want the HTML of the drop down item,
then an extract property must be defined in the strategy object.
