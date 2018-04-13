var delay = 500;
var offset = 6;
var limit = 4;
var end_of_list = false;
var loader = document.getElementById("scroll-loader")
loader.style.visibility = "hidden";

$(window).scroll(function() {
  if($(window).scrollTop() + $(window).height() == $(document).height()) {

    if(end_of_list)
    {
      $(loader).remove();
      return;
    }
    else{
      loader.style.visibility = "visible";
      setTimeout(function() { //delay just to show infinite_scroll
        $.ajax({
           type: 'get',
           url: '/getRecipes',
           data: {limit: limit, offset: offset},
           success: function(recipe) { // your success handler
             loader.style.visibility = "hidden";
             if(recipe.length>0){
                console.log(recipe.length);
                var ul = document.createElement('ul');

                for (var i=0; i<recipe.length; i++){
                  var recipe_preview = document.createElement('div');
                  recipe_preview.className = "recipe-preview extra-recipe col-lg-6 col-md-6";
                  var link = document.createElement('a');
                  var recipe_wrapper = document.createElement('div');
                  recipe_wrapper.className = "recipe-wrapper";
                  var image = document.createElement('div');
                  image.className = "recipe-image";
                  var image_text = document.createElement('div');
                  image_text.className = "image-text";
                  var li = document.createElement('li');

                  $(link).attr("href","/recipes/" + recipe[i].recipe_id);
                  $(image).css({
                    "background":"url('/images/recipe_images/" + recipe[i].image_name + ".png')",
                    "background-size": "cover",
                    "background-position": "center"
                  });
                  image_text.insertAdjacentHTML("beforeend", recipe[i].name + "<br><span> by " + recipe[i].username + "</span>")
                  recipe_wrapper.appendChild(image);
                  recipe_wrapper.appendChild(image_text);
                  link.appendChild(recipe_wrapper);
                  recipe_preview.appendChild(link);
                  li.appendChild(recipe_preview);
                  ul.appendChild(li);
                  document.getElementById("recipe-block").appendChild(ul);
                }
                offset += limit;
             }
             else{
               //no recipes left
               console.log("no moar");
               document.getElementById("recipe-block").insertAdjacentHTML("afterend", "<h3>That's all the recipes! Would you like to <a href='/add_recipe'>add a recipe</a>?</h3><br><br><br>") ;
               end_of_list = true;
             }
           }
        });
      }, delay);
    }
  }
});
