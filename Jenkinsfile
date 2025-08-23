pipeline {
    agent any

    environment {
        // DockerHub credentials ID in Jenkins
        DOCKERHUB_CREDENTIALS = credentials('dockerhub-cred')
        IMAGE_NAME = 'dinaldocker/node-hello-world:latest'
    }

    stages {

        stage('Debug Workspace') {
            steps {
                echo 'Debug: check workspace'
                sh 'pwd'
                sh 'ls -R'
            }
        }

        stage('Checkout') {
            steps {
                // Ensure correct branch
                git branch: 'main', url: 'https://github.com/RMDcharuka/node-hello-world.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${IMAGE_NAME} ."
            }
        }

        stage('Docker Login') {
            steps {
                sh "echo ${DOCKERHUB_CREDENTIALS_PSW} | docker login -u ${DOCKERHUB_CREDENTIALS_USR} --password-stdin"
            }
        }

        stage('Push Docker Image') {
            steps {
                sh "docker push ${IMAGE_NAME}"
            }
        }

        stage('Deploy to Minikube') {
            steps {
                // Apply all YAMLs in config folder
                sh 'kubectl apply -f config/deployment.yaml'
                sh 'kubectl apply -f config/service.yaml'
            }
        }
    }

    post {
        always {
            echo 'Pipeline finished'
        }
    }
}

