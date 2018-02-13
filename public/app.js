// const CreateUser = document.querySelector('.CreateUser')
// if (CreateUser){
//   CreateUser.addEventListener('submit', (e) => {
//     e.preventDefault()
//     const username = CreateUser.querySelector('.username').value
//     const password = CreateUser.querySelector('.password').value
//     const email = CreateUser.querySelector('.email').value
//     post('/createUser', { username, password, email })
//     .then(({ status }) => {
//       console.log(status)
//       if (status === 200) alert('Created User')
//       else alert("Username or email taken")
//     })
//   })
// }

// Using AJAX
//const Login = document.querySelector('.Login')
// if (Login){
//   Login.addEventListener('submit', (e) => {
//     e.preventDefault()
//     const username = Login.querySelector('.username').value
//     const password = Login.querySelector('.password').value
//     post('/login', { username, password })
//     .then(({ status }) => {
//       if (status === 200) alert('login success')
//       else alert('login failed')
//     })
//   })
// }

const AddRecipe = document.querySelector('.AddRecipe')
if (AddRecipe){

}

function post (path, data) {
  return window.fetch(path, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
}
