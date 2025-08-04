import styles from "../feed.module.css"

export default function Stories() {
  // Mock stories data
  const stories = [
    { id: 1, name: "Your Story", image: "https://via.placeholder.com/60/1877f2/ffffff?text=+" },
    { id: 2, name: "John Doe", image: "https://via.placeholder.com/60/42b72a/ffffff?text=J" },
    { id: 3, name: "Jane Smith", image: "https://via.placeholder.com/60/e4405f/ffffff?text=J" },
    { id: 4, name: "Mike Johnson", image: "https://via.placeholder.com/60/f7b928/ffffff?text=M" },
    { id: 5, name: "Sarah Wilson", image: "https://via.placeholder.com/60/8e44ad/ffffff?text=S" },
  ]

  return (
    <div className={styles.storiesSection}>
      <div className={styles.storiesContainer}>
        {stories.map((story) => (
          <div key={story.id} className={styles.storyItem}>
            <div className={styles.storyImage}>
              <img src={story.image} alt={story.name} />
            </div>
            <span className={styles.storyName}>{story.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
} 