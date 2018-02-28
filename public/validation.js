$('#signUpForm').submit(function(e) {
     // this code prevents form from actually being submitted
     console.log("HERE")
     e.preventDefault();
     e.returnValue = false;

     // some validation code here: if valid, add podkres1 class
    var $form = $(this);

    // this is the important part. you want to submit
    // the form but only after the ajax call is completed
     $.ajax({
         type: 'get',
         url: '/usernameTaken',
         context: $form, // context will be "this" in your handlers
         data: {username: $('#username-input').val()},
         success: function(resp) { // your success handler
           console.log(resp)
           if(resp==0){
             this.submit();
           }
           else{
             console.log("username taken")
           }
         }
     });
});
